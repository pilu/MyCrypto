import { State as ConfigState, config } from 'reducers/config';
import { dedupeCustomTokens } from 'utils/tokens';
import {
  State as CustomTokenState,
  INITIAL_STATE as customTokensInitialState
} from 'reducers/customTokens';
import { loadStatePropertyOrEmptyObject } from 'utils/localStorage';
import {
  isStaticNodeId,
  isStaticNetworkId,
  getLanguageSelection,
  getCustomNodeConfigs,
  getSelectedNode,
  getCustomNetworkConfigs,
  getSelectedNetwork
} from 'selectors/config';
import RootReducer, { AppState } from 'reducers';
import CustomNode from 'libs/nodes/custom';
import { CustomNodeConfig } from 'types/node';
const appInitialState = RootReducer(undefined as any, { type: 'inital_state' });

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export function getConfigAndCustomTokensStateToSubscribe(
  state: AppState
): Pick<DeepPartial<AppState>, 'config' | 'customTokens'> {
  const subscribedConfig: DeepPartial<ConfigState> = {
    meta: { languageSelection: getLanguageSelection(state) },
    nodes: { customNodes: getCustomNodeConfigs(state), selectedNode: getSelectedNode(state) },
    networks: {
      customNetworks: getCustomNetworkConfigs(state),
      selectedNetwork: getSelectedNetwork(state)
    }
  };

  const subscribedTokens = state.customTokens;

  return { config: subscribedConfig, customTokens: subscribedTokens };
}

export function rehydrateConfigAndCustomTokenState() {
  const configInitialState = config(undefined as any, { type: 'inital_state' });
  const savedConfigState = loadStatePropertyOrEmptyObject<ConfigState>('config');
  const nextConfigState = { ...configInitialState };

  // If they have a saved node, make sure we assign that too. The node selected
  // isn't serializable, so we have to assign it here.
  if (savedConfigState) {
    // we assign networks first so that when we re-hydrate custom nodes, we can check that the network exists
    nextConfigState.networks = rehydrateNetworks(
      configInitialState.networks,
      savedConfigState.networks
    );
    nextConfigState.nodes = rehydrateNodes(
      configInitialState.nodes,
      savedConfigState.nodes,
      nextConfigState.networks
    );
    nextConfigState.meta = { ...nextConfigState.meta, ...savedConfigState.meta };
  }

  const nextCustomTokenState = rehydrateCustomTokens(nextConfigState.networks);

  return { config: nextConfigState, customTokens: nextCustomTokenState };
}

function rehydrateCustomTokens(networkState: ConfigState['networks']) {
  // Dedupe custom tokens initially
  const savedCustomTokensState =
    loadStatePropertyOrEmptyObject<CustomTokenState>('customTokens') || customTokensInitialState;

  const { customNetworks, selectedNetwork, staticNetworks } = networkState;
  const network = isStaticNetworkId(appInitialState, selectedNetwork)
    ? staticNetworks[selectedNetwork]
    : customNetworks[selectedNetwork];
  return network.isCustom
    ? savedCustomTokensState
    : dedupeCustomTokens(network.tokens, savedCustomTokensState);
}

function rehydrateNetworks(
  initialState: ConfigState['networks'],
  savedState: ConfigState['networks']
): ConfigState['networks'] {
  const nextNetworkState = { ...initialState };
  nextNetworkState.customNetworks = savedState.customNetworks;
  const { customNetworks, selectedNetwork, staticNetworks } = nextNetworkState;
  const nextSelectedNetwork = isStaticNetworkId(appInitialState, savedState.selectedNetwork)
    ? staticNetworks[selectedNetwork]
    : customNetworks[selectedNetwork];
  nextNetworkState.selectedNetwork = nextSelectedNetwork
    ? savedState.selectedNetwork
    : initialState.selectedNetwork;
  return nextNetworkState;
}

function rehydrateNodes(
  initalState: ConfigState['nodes'],
  savedState: ConfigState['nodes'],
  networkState: ConfigState['networks']
): ConfigState['nodes'] {
  const nextNodeState = { ...initalState };

  // re-assign the hydrated nodes
  nextNodeState.customNodes = rehydrateCustomNodes(savedState.customNodes, networkState);
  const { customNodes, staticNodes } = nextNodeState;
  nextNodeState.selectedNode = getSavedSelectedNode(
    nextNodeState.selectedNode,
    savedState.selectedNode,
    customNodes,
    staticNodes
  );
  return nextNodeState;
}

function getSavedSelectedNode(
  initialState: ConfigState['nodes']['selectedNode'],
  savedState: ConfigState['nodes']['selectedNode'],
  customNodes: ConfigState['nodes']['customNodes'],
  staticNodes: ConfigState['nodes']['staticNodes']
): ConfigState['nodes']['selectedNode'] {
  const { nodeId: savedNodeId } = savedState;

  // if 'web3' has persisted as node selection, reset to app default
  // necessary because web3 is only initialized as a node upon MetaMask / Mist unlock

  if (savedNodeId === 'web3') {
    return { nodeId: initialState.nodeId, pending: false };
  }

  const nodeConfigExists = isStaticNodeId(appInitialState, savedNodeId)
    ? staticNodes[savedNodeId]
    : customNodes[savedNodeId];

  return { nodeId: nodeConfigExists ? savedNodeId : initialState.nodeId, pending: false };
}

function rehydrateCustomNodes(
  state: ConfigState['nodes']['customNodes'],
  networkState: ConfigState['networks']
) {
  const networkExists = (networkId: string) => Object.keys(networkState).includes(networkId);

  const rehydratedCustomNodes = Object.entries(state).reduce(
    (hydratedNodes, [customNodeId, configToHydrate]) => {
      if (!networkExists(configToHydrate.network)) {
        return hydratedNodes;
      }

      const lib = new CustomNode(configToHydrate);
      const hydratedNode: CustomNodeConfig = { ...configToHydrate, lib };
      return { ...hydratedNodes, [customNodeId]: hydratedNode };
    },
    {} as ConfigState['nodes']['customNodes']
  );
  return rehydratedCustomNodes;
}