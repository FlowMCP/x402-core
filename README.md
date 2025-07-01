Sehr gern! Hier ist die **vollständige `README.md`** als kopierbarer Markdown-Block:

````markdown
[![Test](https://img.shields.io/github/actions/workflow/status/FlowMCP/x402-core/test-on-release.yml)](https://github.com/FlowMCP/x402-core/actions) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# x402-core
Authorization-based ERC20 payment layer using EIP-3009 and `X-PAYMENT` headers.

x402-core provides client and server-side building blocks for EIP-3009-based token authorization flows. It enables secure, gas-efficient, and trust-minimized payments for web services by exchanging signed `transferWithAuthorization` payloads through custom headers. The module supports both validation and settlement of transactions, and includes matching mechanisms between client-supported and server-required payment options.

## Quickstart

Install and test the module in a local environment with a client-server flow using EIP-3009 and `X-PAYMENT` headers.

```bash
git clone https://github.com/FlowMCP/x402-core
cd x402-core
npm i
````

### Imports and Setup

```js
import { ClientExact, ServerExact, NonceStore } from 'x402-core'
import { EnvironmentManager } from './helpers/EnvironmentManager.mjs'

const chainId = '84532'
const envPath = './../../.env'

// Example config object (shortened)
const cfg = {
    client: { /* client config for chain */ },
    server: { /* server config for chain */ }
}
```

### 1. Setup Payment Requirements (Server)

> Verwendet:
>
> * `cfg.server[chainId]` → server configuration
> * `serverCredentials` → resolved from .env using `EnvironmentManager`

```js
const { privateKey: serverPrivateKey, x402Credentials: serverCredentials } = EnvironmentManager
    .getCredentials( {
        envPath,
        envSelection: cfg['server'][ chainId ]['envSelection']
    } )

const { preparedPaymentOptions } = ServerExact
    .getPreparedPaymentOptions( {
        paymentOptions: cfg['server'][ chainId ]['paymentOptions'],
        activePaymentOptions: cfg['server'][ chainId ]['activePaymentOptions'],
        serverCredentials
    } )

const { paymentRequirementsPayload } = ServerExact
    .getPaymentRequirementsPayload( {
        chainId,
        chainName: cfg['server'][ chainId ]['chainName'],
        preparedPaymentOptions,
        contracts: cfg['server'][ chainId ]['contracts']
    } )
```

### 2. Create Authorization (Client)

> Verwendet:
>
> * `cfg.client[chainId]` → client configuration
> * `clientCredentials` → resolved from .env using `EnvironmentManager`
> * `paymentRequirementsPayload` → vom Server

```js
const { privateKey: clientPrivateKey, x402Credentials: clientCredentials } = EnvironmentManager
    .getCredentials( {
        envPath,
        envSelection: cfg['client'][ chainId ]['envSelection']
    } )

const { paymentOption } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequirementsPayload,
        allowedPaymentOptions: cfg['client'][ chainId ]['allowedPaymentOptions'],
        chainId
    } )

const client = new ClientExact()
    .init( { providerUrl: clientCredentials.clientProviderUrl } )

await client.setWallet( {
    privateKey: clientPrivateKey,
    allowedPaymentOptions: cfg['client'][ chainId ]['allowedPaymentOptions']
} )

const { authorization, signature } = await client
    .createAuthorization( {
        paymentOption,
        allowedPaymentOptions: cfg['client'][ chainId ]['allowedPaymentOptions'],
        chainId
    } )

const { headerString } = client
    .createXPaymentHeader( {
        scheme: paymentOption.scheme,
        network: paymentOption.network,
        authorization,
        signature
    } )
```

### 3. Validate and Settle (Server)

> Verwendet:
>
> * `serverPrivateKey` → aus Schritt 1
> * `paymentRequirementsPayload` → aus Schritt 1
> * `headerString` → vom Client erhalten

```js
const nonceStore = new NonceStore()

const server = new ServerExact( { nonceStore } )
    .init( { providerUrl: serverCredentials.serverProviderUrl } )

await server.setWallet( { privateKey: serverPrivateKey } )

const { decodedPayment } = server
    .decodePaymentHeader( { headerString } )

const { selectedRequirement } = server
    .findMatchingPaymentRequirements( {
        paymentRequirementsPayload,
        decodedPayment
    } )

const validationResult = await server
    .validatePayment( {
        decodedPayment,
        paymentRequirement: selectedRequirement
    } )

const simulationResult = await server
    .simulateTransaction( {
        decodedPayment,
        tokenAddress: paymentOption.extra.domain.verifyingContract
    } )

const settlementResult = await server
    .settleTransaction( {
        decodedPayment,
        tokenAddress: paymentOption.extra.domain.verifyingContract
    } )
```

## Features

* **Client-side Token Authorization**
  Sign and generate EIP-3009 `transferWithAuthorization` messages from local wallets for secure, gasless payments.

* **Server-side Payment Requirement Management**
  Define, configure, and publish token-based payment requirements dynamically via `X-PAYMENT` headers.

* **Validation & Replay Protection**
  Fully validates signature, time window, chain, and nonce — with built-in replay protection using `NonceStore`.

* **Dry-Run Support with `eth_call`**
  Simulate token transfers on-chain before broadcasting, catching invalid states or errors before settlement.

* **Settlement via Meta-Transactions**
  Server executes authorized transfers with `settleTransaction()` — no user gas fees, full control over execution.

## Table of Contents

- [Features](#features)
- [Table of Contents](#table-of-contents)
- [METHODS – ClientExact](#methods--clientexact)
  - [.selectMatchingPaymentOption()](#selectmatchingpaymentoption)
  - [.init()](#init)
  - [.setWallet()](#setwallet)
  - [.createAuthorization()](#createauthorization)
  - [.createXPaymentHeader()](#createxpaymentheader)
- [METHODS – ServerExact](#methods--serverexact)
  - [.getPreparedPaymentOptions()](#getpreparedpaymentoptions)
  - [.getPaymentRequirementsPayload()](#getpaymentrequirementspayload)
  - [.init()](#init-1)
  - [.setWallet()](#setwallet-1)
  - [.decodePaymentHeader()](#decodepaymentheader)
  - [.findMatchingPaymentRequirements()](#findmatchingpaymentrequirements)
  - [.validatePayment()](#validatepayment)
  - [.simulateTransaction()](#simulatetransaction)
  - [.settleTransaction()](#settletransaction)
- [Contribution](#contribution)
- [License](#license)





## METHODS – ClientExact
This class provides utilities for handling on-chain authorization flows for token-based payments using the "exact" scheme. The available methods support wallet setup, token balance inspection, authorization creation, and payment header generation. See also [.init()](#init), [.setWallet()](#setWallet), [.createAuthorization()](#createauthorization), and [.createXPaymentHeader()](#createxpaymentheader).

### .selectMatchingPaymentOption()
Matches a client-side allowed payment option with one of the server's advertised requirements in the `"exact"` scheme. This is typically the first step before creating a payment authorization.

**Method**
```
static .selectMatchingPaymentOption( { paymentRequirementsPayload, allowedPaymentOptions, chainId } )
```

| Key                     | Type              | Description                                                              | Required |
|------------------------|-------------------|--------------------------------------------------------------------------|----------|
| paymentRequirementsPayload | object         | The payload from the server containing supported payment options.        | Yes      |
| allowedPaymentOptions  | array of objects   | Options the client is willing to pay with, including tokenAddress, etc.  | Yes      |
| chainId                | string or number   | The blockchain chain ID to match against the server requirements.        | Yes      |

**Example**
```js
const { paymentOption } = ClientExact
    .selectMatchingPaymentOption( { paymentRequirementsPayload, allowedPaymentOptions, chainId } )
```

**Returns**
```js
returns { paymentOption }
```

| Key           | Type   | Description                               |
|---------------|--------|-------------------------------------------|
| paymentOption | object | The selected server-side payment option.  |

---

### .init()
Initializes the ClientExact instance by connecting to a given provider URL and preparing the ABI for reading balances and token decimals.

**Method**
```
.init( { providerUrl } )
```

| Key         | Type   | Description                          | Required |
|-------------|--------|--------------------------------------|----------|
| providerUrl | string | Full HTTP URL of the blockchain node | Yes      |

**Example**
```js
const client = new ClientExact()
    .init( { providerUrl: 'https://base-sepolia.node.provider' } )
```

**Returns**
```js
returns this
```

| Key   | Type         | Description                                 |
|-------|--------------|---------------------------------------------|
| this  | ClientExact  | The initialized instance for method chaining. |

---

### .setWallet()
Loads a private key into the client and fetches token balances for all allowed payment options. Also logs the capacity to fulfill payments based on current wallet balances.

**Method**
```
.setWallet( { privateKey, allowedPaymentOptions } )
```

| Key                  | Type              | Description                                                                 | Required |
|----------------------|-------------------|-----------------------------------------------------------------------------|----------|
| privateKey           | string            | The private key of the wallet (with or without `0x` prefix).                | Yes      |
| allowedPaymentOptions| array of objects  | List of token payment options client is configured to support.              | Yes      |

**Example**
```js
await client
    .setWallet( { privateKey, allowedPaymentOptions } )
```

**Returns**
```js
returns this
```

| Key   | Type         | Description                                |
|-------|--------------|--------------------------------------------|
| this  | ClientExact  | Returns the same instance for chaining.    |

---

### .createAuthorization()
Creates a signed EIP-3009 `TransferWithAuthorization` message based on the selected payment option. This step is required before generating a payment header.

**Method**
```
.createAuthorization( { paymentOption, allowedPaymentOptions, chainId } )
```

| Key                  | Type              | Description                                                                 | Required |
|----------------------|-------------------|-----------------------------------------------------------------------------|----------|
| paymentOption         | object            | The payment option selected via [.selectMatchingPaymentOption()](#selectmatchingpaymentoption). | Yes      |
| allowedPaymentOptions | array of objects  | The full list of allowed token options including decimals info.             | Yes      |
| chainId               | string or number  | The blockchain chain ID.                                                    | Yes      |

**Example**
```js
const { authorization, signature } = await client
    .createAuthorization( { paymentOption, allowedPaymentOptions, chainId } )
```

**Returns**
```js
returns { authorization, signature }
```

| Key           | Type     | Description                                                 |
|---------------|----------|-------------------------------------------------------------|
| authorization | object   | The structured authorization message (EIP-3009 format).     |
| signature     | string   | Signature for the authorization message.                    |

---

### .createXPaymentHeader()
Creates the final `X-PAYMENT` header string which includes the authorization and its signature. This header can be sent to the server for validation and execution.

**Method**
```
.createXPaymentHeader( { scheme, network, authorization, signature } )
```

| Key           | Type     | Description                                                                 | Required |
|---------------|----------|-----------------------------------------------------------------------------|----------|
| scheme        | string   | The payment scheme (should be `'exact'`).                                   | Yes      |
| network       | string   | Network name, e.g. `'base-sepolia'`.                                        | Yes      |
| authorization | object   | The `authorization` object from [.createAuthorization()](#createauthorization). | Yes  |
| signature     | string   | The signed authorization.                                                   | Yes      |

**Example**
```js
const { headerString } = client
    .createXPaymentHeader( { scheme, network, authorization, signature } )
```

**Returns**
```js
returns { headerString }
```

| Key          | Type   | Description                                       |
|--------------|--------|---------------------------------------------------|
| headerString | string | The full JSON-encoded `X-PAYMENT` header string.  |

---

## METHODS – ServerExact
The `ServerExact` class facilitates the server-side flow of the "exact" payment scheme. It prepares payment requirements, validates incoming authorization headers, simulates token transfers, and settles transactions on-chain.

### .getPreparedPaymentOptions()
Resolves template variables in the `payTo` fields of active payment options using the server's credentials, and prepares a finalized object with payment options ready to send to clients.

**Method**
```
static .getPreparedPaymentOptions( { paymentOptions, activePaymentOptions, serverCredentials } )
```

| Key               | Type              | Description                                                              | Required |
|-------------------|-------------------|--------------------------------------------------------------------------|----------|
| paymentOptions     | object            | Full mapping of all possible payment options by contract ID.             | Yes      |
| activePaymentOptions | array of strings | List of contract IDs to be activated.                                    | Yes      |
| serverCredentials  | object            | Key-value pairs used to replace `{{...}}` placeholders in `payTo`.       | Yes      |

**Example**
```js
const { preparedPaymentOptions } = ServerExact
    .getPreparedPaymentOptions( { paymentOptions, activePaymentOptions, serverCredentials } )
```

**Returns**
```js
returns { preparedPaymentOptions }
```

| Key                    | Type   | Description                                                   |
|------------------------|--------|---------------------------------------------------------------|
| preparedPaymentOptions | object | Payment options with resolved `payTo` values, keyed by ID.    |

---

### .getPaymentRequirementsPayload()
Generates a full `paymentRequirementsPayload` that can be served to the client. Includes information like target contract, network, domain details, and limits.

**Method**
```
static .getPaymentRequirementsPayload( { chainId, chainName, preparedPaymentOptions, contracts, resource='' } )
```

| Key                   | Type             | Description                                                                | Required |
|------------------------|------------------|----------------------------------------------------------------------------|----------|
| chainId                | string or number | The blockchain chain ID.                                                   | Yes      |
| chainName              | string           | The network name (e.g. `'base-sepolia'`).                                  | Yes      |
| preparedPaymentOptions | object           | Output from [.getPreparedPaymentOptions()](#getpreparedpaymentoptions).    | Yes      |
| contracts              | object           | Mapping of contract details by ID, including `domainName`, `decimals`, etc.| Yes      |
| resource               | string           | Optional resource context for the payment.                                 | No       |

**Example**
```js
const { paymentRequirementsPayload } = ServerExact
    .getPaymentRequirementsPayload( { chainId, chainName, preparedPaymentOptions, contracts, resource: '' } )
```

**Returns**
```js
returns { paymentRequirementsPayload }
```

| Key                      | Type   | Description                                                |
|--------------------------|--------|------------------------------------------------------------|
| paymentRequirementsPayload | object | Structured payload to be sent to clients.                  |

---

### .init()
Initializes the server facilitator by connecting to the blockchain provider and preparing the contract ABI used for token interaction.

**Method**
```
.init( { providerUrl } )
```

| Key         | Type   | Description                          | Required |
|-------------|--------|--------------------------------------|----------|
| providerUrl | string | Full HTTP URL of the blockchain node | Yes      |

**Example**
```js
const server = new ServerExact( { nonceStore } )
    .init( { providerUrl } )
```

**Returns**
```js
returns this
```

| Key   | Type        | Description                                   |
|-------|-------------|-----------------------------------------------|
| this  | ServerExact | The initialized instance for method chaining. |

---

### .setWallet()
Sets the wallet private key on the server, connects it via `viem`, and logs or verifies ETH balance sufficiency.

**Method**
```
.setWallet( { privateKey, minEth = '0.01' } )
```

| Key      | Type   | Description                                               | Required |
|----------|--------|-----------------------------------------------------------|----------|
| privateKey | string | The private key of the facilitator wallet (with or without `0x`). | Yes  |
| minEth     | string | Minimum ETH required for settlement operations.          | No       |

**Example**
```js
await server
    .setWallet( { privateKey, minEth: '0.02' } )
```

**Returns**
```js
returns this
```

| Key   | Type        | Description                                   |
|-------|-------------|-----------------------------------------------|
| this  | ServerExact | The same instance for chaining.               |

---

### .decodePaymentHeader()
Parses and converts a received `X-PAYMENT` header string into a usable internal payment structure. Also casts numeric fields like `value`, `validAfter`, and `validBefore` to `BigInt`.

**Method**
```
.decodePaymentHeader( { headerString } )
```

| Key          | Type   | Description                                   | Required |
|--------------|--------|-----------------------------------------------|----------|
| headerString | string | The JSON-encoded `X-PAYMENT` header received from the client. | Yes |

**Example**
```js
const { decodedPayment } = server
    .decodePaymentHeader( { headerString } )
```

**Returns**
```js
returns { decodedPayment }
```

| Key            | Type   | Description                               |
|----------------|--------|-------------------------------------------|
| decodedPayment | object | The parsed and normalized payment object. |

---

### .findMatchingPaymentRequirements()
Searches through the provided `paymentRequirementsPayload` and finds the requirement that matches the authorization details (scheme, network, payTo).

**Method**
```
.findMatchingPaymentRequirements( { paymentRequirementsPayload, decodedPayment } )
```

| Key                       | Type   | Description                                                         | Required |
|---------------------------|--------|---------------------------------------------------------------------|----------|
| paymentRequirementsPayload | object | The payload originally sent to the client.                          | Yes      |
| decodedPayment            | object | The parsed object from [.decodePaymentHeader()](#decodepaymentheader). | Yes      |

**Example**
```js
const { selectedRequirement } = server
    .findMatchingPaymentRequirements( { paymentRequirementsPayload, decodedPayment } )
```

**Returns**
```js
returns { selectedRequirement }
```

| Key                | Type   | Description                                             |
|--------------------|--------|---------------------------------------------------------|
| selectedRequirement| object or null | The matching requirement, or `null` if not found.   |

---

### .validatePayment()
Performs basic validation checks on the payment, including time window checks and replay protection via nonce tracking.

**Method**
```
.validatePayment( { decodedPayment, paymentRequirement } )
```

| Key                | Type   | Description                                                                | Required |
|--------------------|--------|----------------------------------------------------------------------------|----------|
| decodedPayment     | object | Result of [.decodePaymentHeader()](#decodepaymentheader).                  | Yes      |
| paymentRequirement | object | The selected requirement from [.findMatchingPaymentRequirements()](#findmatchingpaymentrequirements). | Yes |

**Example**
```js
const result = await server
    .validatePayment( { decodedPayment, paymentRequirement: selectedRequirement } )
```

**Returns**
```js
returns { ok, error? }
```

| Key   | Type    | Description                                      |
|--------|---------|--------------------------------------------------|
| ok     | boolean | `true` if validation passed, `false` otherwise. |
| error  | string  | Optional error message if validation failed.     |

---

### .simulateTransaction()
Simulates a token transfer using `eth_call` to detect potential execution errors without sending a transaction.

**Method**
```
.simulateTransaction( { decodedPayment, tokenAddress } )
```

| Key            | Type   | Description                                | Required |
|----------------|--------|--------------------------------------------|----------|
| decodedPayment | object | Parsed payment header, including signature. | Yes      |
| tokenAddress   | string | Contract address of the token to be transferred. | Yes |

**Example**
```js
const simulationResult = await server
    .simulateTransaction( { decodedPayment, tokenAddress } )
```

**Returns**
```js
returns { ok, error? }
```

| Key   | Type    | Description                                       |
|--------|---------|---------------------------------------------------|
| ok     | boolean | `true` if simulation succeeded, `false` if failed |
| error  | string  | Optional error message if simulation failed       |

---

### .settleTransaction()
Sends the actual `transferWithAuthorization` transaction to the blockchain using the server's wallet.

**Method**
```
.settleTransaction( { decodedPayment, tokenAddress } )
```

| Key            | Type   | Description                                | Required |
|----------------|--------|--------------------------------------------|----------|
| decodedPayment | object | Parsed and validated payment header         | Yes      |
| tokenAddress   | string | Address of the token contract               | Yes      |

**Example**
```js
const settlementResult = await server
    .settleTransaction( { decodedPayment, tokenAddress } )
```

**Returns**
```js
returns { ok, txHash }
```

| Key    | Type    | Description                                |
|--------|---------|--------------------------------------------|
| ok     | boolean | Whether the settlement transaction was broadcast |
| txHash | string  | Transaction hash of the submitted transaction    |



## Contribution

Contributions are welcome!
If you encounter bugs, have feature suggestions, or want to improve the module, feel free to open an issue or submit a pull request.

Please make sure your code follows the formatting rules in `Formatierungsregeln.md` and includes meaningful tests.

## License

This project is licensed under the MIT License.
See the [LICENSE](./LICENSE) file for details.

```

---

✅ Du kannst das jetzt direkt übernehmen, committen oder bei Bedarf noch anpassen. Wenn du möchtest, helfe ich dir auch gern noch bei einer passenden `package.json`, einem `LICENSE`-File oder der Testkonfiguration. Sag einfach Bescheid!
```
