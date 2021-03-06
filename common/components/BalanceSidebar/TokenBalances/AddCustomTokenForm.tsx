import React from 'react';
import { HELP_ARTICLE } from 'config';
import { isPositiveIntegerOrZero, isValidETHAddress } from 'libs/validators';
import translate from 'translations';
import { HelpLink, Input } from 'components/ui';
import './AddCustomTokenForm.scss';
import { Token } from 'types/network';

interface Props {
  allTokens: Token[];
  onSave(params: Token): void;
  toggleForm(): void;
}

interface IGenerateSymbolLookup {
  [tokenSymbol: string]: boolean;
}

interface State {
  tokenSymbolLookup: IGenerateSymbolLookup;
  address: string;
  symbol: string;
  decimal: string;
}

export default class AddCustomTokenForm extends React.PureComponent<Props, State> {
  public state: State = {
    tokenSymbolLookup: {},
    address: '',
    symbol: '',
    decimal: ''
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      ...this.state,
      tokenSymbolLookup: this.generateSymbolLookup(props.allTokens)
    };
  }

  public render() {
    const { address, symbol, decimal } = this.state;
    const errors = this.getErrors();

    const fields = [
      {
        name: 'symbol',
        value: symbol,
        label: translate('TOKEN_Symbol')
      },
      {
        name: 'address',
        value: address,
        label: translate('TOKEN_Addr')
      },
      {
        name: 'decimal',
        value: decimal,
        label: translate('TOKEN_Dec')
      }
    ];

    return (
      <form className="AddCustom" onSubmit={this.onSave}>
        {fields.map(field => {
          return (
            <label className="AddCustom-field form-group" key={field.name}>
              <div className="input-group-header">{field.label}</div>
              <Input
                className={`${
                  errors[field.name] ? 'invalid' : field.value ? 'valid' : ''
                } input-group-input-small`}
                type="text"
                name={field.name}
                value={field.value}
                onChange={this.onFieldChange}
              />
              {typeof errors[field.name] === 'string' && (
                <div className="AddCustom-field-error">{errors[field.name]}</div>
              )}
            </label>
          );
        })}

        <HelpLink article={HELP_ARTICLE.ADDING_NEW_TOKENS} className="AddCustom-buttons-help">
          {translate('Need help? Learn how to add custom tokens.')}
        </HelpLink>
        <div className="AddCustom-buttons">
          <button
            className="AddCustom-buttons-btn btn btn-sm btn-default"
            onClick={this.props.toggleForm}
          >
            {translate('x_Cancel')}
          </button>
          <button
            className="AddCustom-buttons-btn btn btn-primary btn-sm"
            disabled={!this.isValid()}
          >
            {translate('x_Save')}
          </button>
        </div>
      </form>
    );
  }

  public getErrors() {
    const { address, symbol, decimal } = this.state;
    const errors: { [key: string]: boolean | string } = {};

    // Formatting errors
    if (decimal && !isPositiveIntegerOrZero(parseInt(decimal, 10))) {
      errors.decimal = true;
    }
    if (address && !isValidETHAddress(address)) {
      errors.address = true;
    }

    // Message errors
    if (symbol && this.state.tokenSymbolLookup[symbol]) {
      errors.symbol = 'A token with this symbol already exists';
    }

    return errors;
  }

  public isValid() {
    const { address, symbol, decimal } = this.state;
    return !Object.keys(this.getErrors()).length && address && symbol && decimal;
  }

  public onFieldChange = (e: React.FormEvent<HTMLInputElement>) => {
    // TODO: typescript bug: https://github.com/Microsoft/TypeScript/issues/13948
    const name: any = e.currentTarget.name;
    const value = e.currentTarget.value;
    this.setState({ [name]: value });
  };

  public onSave = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!this.isValid()) {
      return;
    }

    const { address, symbol, decimal } = this.state;
    this.props.onSave({ address, symbol, decimal: parseInt(decimal, 10) });
  };

  private generateSymbolLookup(tokens: Token[]) {
    return tokens.reduce(
      (prev, tk) => {
        prev[tk.symbol] = true;
        return prev;
      },
      {} as IGenerateSymbolLookup
    );
  }
}
