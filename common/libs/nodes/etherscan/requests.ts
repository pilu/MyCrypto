import ERC20 from 'libs/erc20';
import RPCRequests from '../rpc/requests';
import {
  CallRequest,
  EstimateGasRequest,
  GetBalanceRequest,
  GetTokenBalanceRequest,
  GetTransactionCountRequest,
  GetTransactionByHashRequest,
  SendRawTxRequest,
  GetCurrentBlockRequest
} from './types';
import { Token } from 'types/network';
import { IHexStrWeb3Transaction, IHexStrTransaction } from 'libs/transaction';

export default class EtherscanRequests extends RPCRequests {
  public sendRawTx(signedTx: string): SendRawTxRequest {
    return {
      module: 'proxy',
      action: 'eth_sendRawTransaction',
      hex: signedTx
    };
  }

  public estimateGas(transaction: IHexStrWeb3Transaction): EstimateGasRequest {
    return {
      module: 'proxy',
      action: 'eth_estimateGas',
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      from: transaction.from
    };
  }

  public getBalance(address: string): GetBalanceRequest {
    return {
      module: 'account',
      action: 'balance',
      tag: 'latest',
      address
    };
  }

  public ethCall(transaction: Pick<IHexStrTransaction, 'to' | 'data'>): CallRequest {
    return {
      module: 'proxy',
      action: 'eth_call',
      to: transaction.to,
      data: transaction.data
    };
  }

  public getTransactionCount(address: string): GetTransactionCountRequest {
    return {
      module: 'proxy',
      action: 'eth_getTransactionCount',
      tag: 'latest',
      address
    };
  }

  public getTransactionByHash(txhash: string): GetTransactionByHashRequest {
    return {
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash
    };
  }

  public getTokenBalance(address: string, token: Token): GetTokenBalanceRequest {
    return this.ethCall({
      to: token.address,
      data: ERC20.balanceOf.encodeInput({ _owner: address })
    });
  }

  public getCurrentBlock(): GetCurrentBlockRequest {
    return {
      module: 'proxy',
      action: 'eth_blockNumber'
    };
  }
}
