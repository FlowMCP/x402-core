> **Current v2 Documentation**
> This is the documentation for x402-core v2 (exact scheme, EVM).
> For legacy v1 documentation, see [docs/v1/README.md](../v1/README.md).
> For migration guidance, see [MIGRATION.md](../../MIGRATION.md).

---

[![Test](https://img.shields.io/github/actions/workflow/status/FlowMCP/x402-core/test-on-release.yml)](https://github.com/FlowMCP/x402-core/actions) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# x402-core (v2)
Authorization-based ERC20 payment layer using EIP-3009 and HTTP payment headers.

x402-core v2 provides client and server-side building blocks for EIP-3009-based token authorization flows. It enables secure, gas-efficient, and trust-minimized payments for web services by exchanging signed `transferWithAuthorization` payloads through dedicated HTTP headers (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`). The module supports configuration validation, deterministic payment option selection, and includes matching mechanisms between client-supported and server-required payment options.

## Quickstart

Install and test the module in a local environment with a client-server flow using EIP-3009 and HTTP payment headers.

```bash
git clone https://github.com/FlowMCP/x402-core
cd x402-core
npm i
````

### Imports and Setup

```js
import { ClientExact, ServerExact, NonceStore } from 'x402-core/v2/exact/evm'
import { PaymentHeaders } from 'x402-core/v2/transports/http'
import { ConfigValidator } from 'x402-core/v2/config'

const chainId = '84532'

// Configuration with contract catalog and payment options
const cfg = {
    server: {
        contractCatalog: {
            'usdc-base-sepolia': {
                paymentNetworkId: 'eip155:84532',
                address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                decimals: 6,
                domainName: 'USDC',
                domainVersion: '2'
            }
        },
        paymentOptionCatalog: {
            'usdc-001': {
                contractId: 'usdc-base-sepolia',
                amount: '10000',
                payTo: '{{payTo1}}',
                maxTimeoutSeconds: 300
            }
        },
        acceptedPaymentOptionIdList: [ 'usdc-001' ]
    },
    client: {
        clientSupportedPaymentNetworkIdList: [ 'eip155:84532' ],
        clientAllowedAssetConstraintList: [
            { asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmount: '1000000' }
        ]
    }
}
```

### 1. Validate Configuration (Server)

> Use:
>
> * `contractCatalog` -> token contract definitions
> * `paymentOptionCatalog` -> payment option definitions
> * `serverPayToAddressMap` -> resolves `{{alias}}` placeholders

```js
const serverPayToAddressMap = { 'payTo1': '0xYourServerAddress...' }

const { configurationValidationOk, configurationValidationIssueList } = ConfigValidator
    .validateX402V2ExactEvmConfiguration( {
        contractCatalog: cfg.server.contractCatalog,
        paymentOptionCatalog: cfg.server.paymentOptionCatalog,
        serverPayToAddressMap
    } )

if( !configurationValidationOk ) {
    console.error( 'Configuration validation failed:', configurationValidationIssueList )
    process.exit( 1 )
}
```

### 2. Build PaymentRequired Response (Server)

> Use:
>
> * `paymentOptionCatalog` -> from configuration
> * `contractCatalog` -> from configuration
> * `monetizedResourceDescriptor` -> the resource being protected

```js
const { preparedPaymentOptionCatalog } = ServerExact
    .getPreparedPaymentOptionCatalog( {
        paymentOptionCatalog: cfg.server.paymentOptionCatalog,
        serverPayToAddressMap,
        serverDefaultMaxTimeoutSeconds: 300,
        contractCatalog: cfg.server.contractCatalog
    } )

const { paymentRequiredResponsePayload } = ServerExact
    .getPaymentRequiredResponsePayload( {
        monetizedResourceDescriptor: 'https://api.example.com/resource/123',
        acceptedPaymentOptionIdList: cfg.server.acceptedPaymentOptionIdList,
        preparedPaymentOptionCatalog,
        contractCatalog: cfg.server.contractCatalog
    } )

const { paymentRequiredHeaderValue } = PaymentHeaders
    .encodePaymentRequiredHeaderValue( {
        paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload
    } )
```

### 3. Select Payment Option (Client)

> Use:
>
> * `paymentRequiredHeaderValue` -> received from server (HTTP 402 response)
> * `clientSupportedPaymentNetworkIdList` -> networks the client supports
> * `clientAllowedAssetConstraintList` -> assets and max amounts client allows

```js
const client = new ClientExact( { silent: false } )
    .init( { providerUrl: 'https://base-sepolia.node.provider' } )
await client
    .setWallet( { privateKey: '0x...' } )

const { decodedPaymentRequiredResponsePayload } = client
    .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
    .validatePaymentRequiredResponsePayload( {
        paymentRequiredResponsePayloadToValidate: decodedPaymentRequiredResponsePayload
    } )

const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload,
        clientAllowedAssetConstraintList: cfg.client.clientAllowedAssetConstraintList,
        clientSupportedPaymentNetworkIdList: cfg.client.clientSupportedPaymentNetworkIdList,
        paymentOptionSelectionPolicy: null
    } )
```

### 4. Create Authorization (Client)

> Use:
>
> * `selectedPaymentRequirements` -> from payment option selection
> * `exactEvmAuthorizationTimeWindowDefinition` -> optional time window configuration

```js
const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
    .createAuthorization( {
        selectedPaymentRequirements,
        exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 }
    } )

const { paymentPayload } = ClientExact
    .createPaymentPayloadObject( {
        resource: decodedPaymentRequiredResponsePayload.resource,
        selectedPaymentRequirements,
        exactEvmAuthorizationPayload,
        exactEvmAuthorizationSignature
    } )

const { paymentSignatureHeaderValue } = client
    .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )
```

### 5. Validate and Settle (Server)

> Use:
>
> * `paymentSignatureHeaderValue` -> received from client
> * `paymentRequiredResponsePayload` -> the original requirements sent to client

```js
const nonceStore = new NonceStore()
const server = new ServerExact( { nonceStore, silent: false } )
    .init( { providerUrl: 'https://base-sepolia.node.provider' } )
await server
    .setWallet( { privateKey: '0x...' } )

const { decodedPaymentSignatureRequestPayload } = server
    .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

const { paymentSignatureRequestPayloadValidationOutcome } = server
    .validatePaymentSignatureRequestPayload( {
        decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload,
        paymentRequiredResponsePayload
    } )

const { matchedPaymentRequirementsFromClientPayload } = paymentSignatureRequestPayloadValidationOutcome

const { paymentSimulationOutcome } = await server
    .simulateTransaction( {
        decodedPaymentSignatureRequestPayload,
        matchedPaymentRequirementsFromClientPayload
    } )

const { paymentSettlementOutcome } = await server
    .settleTransaction( {
        decodedPaymentSignatureRequestPayload,
        matchedPaymentRequirementsFromClientPayload
    } )

const { paymentResponseHeaderValue } = server
    .createPaymentResponseHeader( {
        paymentResponseSettlementPayload: paymentSettlementOutcome.settlementResponse
    } )
```

## Features

* **Contract Catalog Configuration**
  Define token contracts once with network, address, decimals, and EIP-712 domain info. Reference them by ID across payment options.

* **Payment Option Catalog**
  Configure payment options with contract references, amounts, and `{{alias}}` placeholders for server addresses resolved at runtime.

* **Configuration Validation**
  Validate contract catalogs, payment options, and alias resolution before starting the server with detailed issue paths.

* **Deterministic Payment Selection**
  Select matching payment options based on client constraints (supported networks, allowed assets, max amounts) with policy-based tie-breaking.

* **Three-Header HTTP Protocol**
  Uses `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, and `PAYMENT-RESPONSE` headers with Base64-encoded JSON payloads.

* **CAIP-2 Network Identifiers**
  Networks use `eip155:<chainId>` format for unambiguous chain identification.

* **Validation Issue Lists**
  All validators return structured issue lists with `issuePath`, `issueCode`, and `issueMessage` for precise error localization.

* **Nonce-Based Replay Protection**
  Server-side `NonceStore` tracks used nonces, marking them only after successful settlement to allow retry on failures.

* **Dry-Run Support with `eth_call`**
  Simulate token transfers on-chain before broadcasting, catching invalid states or errors before settlement.

* **Settlement via Meta-Transactions**
  Server executes authorized transfers with `settleTransaction()` - no user gas fees, full control over execution.

## Key Changes from v1

| Aspect | v1 | v2 |
|--------|-----|-----|
| HTTP Headers | `X-PAYMENT` (JSON) | `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` (Base64) |
| Network ID | `chainId` string | `eip155:<chainId>` (CAIP-2 format) |
| Config Model | Inline options | `contractCatalog` + `paymentOptionCatalog` |
| Selection | First match | Deterministic policy-based selection |
| Validation | Simple checks | Issue list with paths and spec error codes |
| Nonce Timing | Marked during validation | Marked after successful settlement |

## Table of Contents

- [x402-core (v2)](#x402-core-v2)
  - [Quickstart](#quickstart)
    - [Imports and Setup](#imports-and-setup)
    - [1. Validate Configuration (Server)](#1-validate-configuration-server)
    - [2. Build PaymentRequired Response (Server)](#2-build-paymentrequired-response-server)
    - [3. Select Payment Option (Client)](#3-select-payment-option-client)
    - [4. Create Authorization (Client)](#4-create-authorization-client)
    - [5. Validate and Settle (Server)](#5-validate-and-settle-server)
  - [Features](#features)
  - [Key Changes from v1](#key-changes-from-v1)
  - [Table of Contents](#table-of-contents)
  - [METHODS - ClientExact](#methods---clientexact)
    - [.init()](#init)
    - [.setWallet()](#setwallet)
    - [.decodePaymentRequiredHeader()](#decodepaymentrequiredheader)
    - [.createAuthorization()](#createauthorization)
    - [.createPaymentSignatureHeader()](#createpaymentsignatureheader)
    - [.validatePaymentRequiredResponsePayload()](#validatepaymentrequiredresponsepayload)
    - [.selectMatchingPaymentOption()](#selectmatchingpaymentoption)
    - [.createPaymentPayloadObject()](#createpaymentpayloadobject)
  - [METHODS - ServerExact](#methods---serverexact)
    - [.getPreparedPaymentOptionCatalog()](#getpreparedpaymentoptioncatalog)
    - [.getPaymentRequiredResponsePayload()](#getpaymentrequiredresponsepayload)
    - [.init()](#init-1)
    - [.setWallet()](#setwallet-1)
    - [.decodePaymentSignatureHeader()](#decodepaymentsignatureheader)
    - [.validatePaymentSignatureRequestPayload()](#validatepaymentsignaturerequestpayload)
    - [.simulateTransaction()](#simulatetransaction)
    - [.settleTransaction()](#settletransaction)
    - [.createPaymentResponseHeader()](#createpaymentresponseheader)
  - [METHODS - NonceStore](#methods---noncestore)
    - [.isUsed()](#isused)
    - [.markUsed()](#markused)
  - [Contribution](#contribution)
  - [License](#license)





## METHODS - ClientExact
This class provides utilities for handling on-chain authorization flows for token-based payments using the "exact" scheme. The available methods support wallet setup, payment requirement decoding, authorization creation, and payment header generation. See also [.init()](#init), [.setWallet()](#setwallet), [.createAuthorization()](#createauthorization), and [.createPaymentSignatureHeader()](#createpaymentsignatureheader).

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
const client = new ClientExact( { silent: false } )
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
Loads a private key into the client, creating a signer for authorization signatures. The wallet address is logged for verification.

**Method**
```
async .setWallet( { privateKey } )
```

| Key        | Type   | Description                                                  | Required |
|------------|--------|--------------------------------------------------------------|----------|
| privateKey | string | The private key of the wallet (with or without `0x` prefix). | Yes      |

**Example**
```js
await client
    .setWallet( { privateKey: '0x...' } )
```

**Returns**
```js
returns this
```

| Key   | Type         | Description                                |
|-------|--------------|--------------------------------------------|
| this  | ClientExact  | Returns the same instance for chaining.    |

---

### .decodePaymentRequiredHeader()
Decodes a Base64-encoded `PAYMENT-REQUIRED` header value received from the server into a usable payment requirements object.

**Method**
```
.decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode } )
```

| Key                               | Type   | Description                                           | Required |
|-----------------------------------|--------|-------------------------------------------------------|----------|
| paymentRequiredHeaderValueToDecode | string | The Base64-encoded `PAYMENT-REQUIRED` header value.   | Yes      |

**Example**
```js
const { decodedPaymentRequiredResponsePayload } = client
    .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: headerValue } )
```

**Returns**
```js
returns { decodedPaymentRequiredResponsePayload }
```

| Key                                  | Type   | Description                                    |
|--------------------------------------|--------|------------------------------------------------|
| decodedPaymentRequiredResponsePayload | object | The decoded payment requirements payload.      |

---

### .createAuthorization()
Creates a signed EIP-3009 `TransferWithAuthorization` message based on the selected payment requirements. This step is required before generating a payment header.

**Method**
```
async .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition } )
```

| Key                                    | Type   | Description                                                                 | Required |
|----------------------------------------|--------|-----------------------------------------------------------------------------|----------|
| selectedPaymentRequirements            | object | The payment requirements selected via [.selectMatchingPaymentOption()](#selectmatchingpaymentoption). | Yes |
| exactEvmAuthorizationTimeWindowDefinition | object | Time window configuration with `validAfterOffsetSeconds` and `validBeforeOffsetSeconds`. | No |

**Example**
```js
const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
    .createAuthorization( {
        selectedPaymentRequirements,
        exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 }
    } )
```

**Returns**
```js
returns { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature }
```

| Key                           | Type   | Description                                                 |
|-------------------------------|--------|-------------------------------------------------------------|
| exactEvmAuthorizationPayload   | object | The structured authorization message (EIP-3009 format).     |
| exactEvmAuthorizationSignature | string | Signature for the authorization message.                    |

---

### .createPaymentSignatureHeader()
Creates the Base64-encoded `PAYMENT-SIGNATURE` header value from a payment payload object. This header is sent to the server for validation and execution.

**Method**
```
.createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode } )
```

| Key                                | Type   | Description                                                                 | Required |
|------------------------------------|--------|-----------------------------------------------------------------------------|----------|
| paymentSignatureRequestPayloadToEncode | object | The payment payload object from [.createPaymentPayloadObject()](#createpaymentpayloadobject). | Yes |

**Example**
```js
const { paymentSignatureHeaderValue } = client
    .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )
```

**Returns**
```js
returns { paymentSignatureHeaderValue }
```

| Key                       | Type   | Description                                           |
|---------------------------|--------|-------------------------------------------------------|
| paymentSignatureHeaderValue | string | The Base64-encoded `PAYMENT-SIGNATURE` header value.  |

---

### .validatePaymentRequiredResponsePayload()
Validates the structure of a decoded payment requirements payload. Returns validation outcome with issue list for precise error localization.

**Method**
```
static .validatePaymentRequiredResponsePayload( { paymentRequiredResponsePayloadToValidate } )
```

| Key                                    | Type   | Description                                              | Required |
|----------------------------------------|--------|----------------------------------------------------------|----------|
| paymentRequiredResponsePayloadToValidate | object | The decoded payload to validate.                         | Yes      |

**Example**
```js
const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
    .validatePaymentRequiredResponsePayload( {
        paymentRequiredResponsePayloadToValidate: decodedPayload
    } )

if( !paymentRequiredResponsePayloadValidationOutcome.validationOk ) {
    console.error( paymentRequiredResponsePayloadValidationOutcome.validationIssueList )
}
```

**Returns**
```js
returns { paymentRequiredResponsePayloadValidationOutcome }
```

| Key                                         | Type   | Description                                                   |
|---------------------------------------------|--------|---------------------------------------------------------------|
| paymentRequiredResponsePayloadValidationOutcome | object | Contains `validationOk` (boolean) and `validationIssueList` (array). |

---

### .selectMatchingPaymentOption()
Matches client-side constraints against server's advertised payment options. Filters by scheme, network, and asset constraints, then selects using policy.

**Method**
```
static .selectMatchingPaymentOption( { paymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy } )
```

| Key                               | Type            | Description                                                              | Required |
|-----------------------------------|-----------------|--------------------------------------------------------------------------|----------|
| paymentRequiredResponsePayload    | object          | The decoded payload from the server containing `accepts` array.          | Yes      |
| clientAllowedAssetConstraintList  | array of objects | Constraints with `asset` address and optional `maxAmount`.               | Yes      |
| clientSupportedPaymentNetworkIdList | array of strings | Networks the client supports (e.g., `['eip155:84532']`).                | Yes      |
| paymentOptionSelectionPolicy      | object or null  | Optional policy with `preferredNetworkOrder`, `preferredAssetOrder`, `tieBreaker`. | No |

**Example**
```js
const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientAllowedAssetConstraintList: [ { asset: '0x...', maxAmount: '1000000' } ],
        clientSupportedPaymentNetworkIdList: [ 'eip155:84532' ],
        paymentOptionSelectionPolicy: null
    } )
```

**Returns**
```js
returns { selectedPaymentRequirements, paymentOptionSelectionDiagnostics }
```

| Key                             | Type        | Description                                                   |
|---------------------------------|-------------|---------------------------------------------------------------|
| selectedPaymentRequirements     | object or null | The selected server-side payment option, or `null` if none match. |
| paymentOptionSelectionDiagnostics | object     | Diagnostics with filter counts and selection reason.          |

---

### .createPaymentPayloadObject()
Creates a structured payment payload object containing the accepted payment option, authorization, and signature. Used to create the `PAYMENT-SIGNATURE` header.

**Method**
```
static .createPaymentPayloadObject( { resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )
```

| Key                           | Type   | Description                                                                 | Required |
|-------------------------------|--------|-----------------------------------------------------------------------------|----------|
| resource                      | string | The resource descriptor from the payment requirements.                      | Yes      |
| selectedPaymentRequirements   | object | The selected payment option from [.selectMatchingPaymentOption()](#selectmatchingpaymentoption). | Yes |
| exactEvmAuthorizationPayload  | object | The authorization object from [.createAuthorization()](#createauthorization). | Yes |
| exactEvmAuthorizationSignature | string | The signature from [.createAuthorization()](#createauthorization).          | Yes |

**Example**
```js
const { paymentPayload } = ClientExact
    .createPaymentPayloadObject( {
        resource: 'https://api.example.com/resource/123',
        selectedPaymentRequirements,
        exactEvmAuthorizationPayload,
        exactEvmAuthorizationSignature
    } )
```

**Returns**
```js
returns { paymentPayload }
```

| Key            | Type   | Description                                              |
|----------------|--------|----------------------------------------------------------|
| paymentPayload | object | The structured payment payload ready for header encoding. |

---

## METHODS - ServerExact
The `ServerExact` class facilitates the server-side flow of the "exact" payment scheme. It prepares payment requirements, validates incoming authorization headers, simulates token transfers, and settles transactions on-chain.

### .getPreparedPaymentOptionCatalog()
Resolves `{{alias}}` placeholders in `payTo` fields using the server's address map, and derives network IDs from the contract catalog.

**Method**
```
static .getPreparedPaymentOptionCatalog( { paymentOptionCatalog, serverPayToAddressMap, serverDefaultMaxTimeoutSeconds, contractCatalog } )
```

| Key                            | Type   | Description                                                              | Required |
|--------------------------------|--------|--------------------------------------------------------------------------|----------|
| paymentOptionCatalog           | object | Payment options keyed by option ID.                                      | Yes      |
| serverPayToAddressMap          | object | Key-value pairs to resolve `{{...}}` placeholders in `payTo`.            | Yes      |
| serverDefaultMaxTimeoutSeconds | number | Default timeout if not specified per option. Default: `300`.             | No       |
| contractCatalog                | object | Contract definitions keyed by contract ID.                               | Yes      |

**Example**
```js
const { preparedPaymentOptionCatalog } = ServerExact
    .getPreparedPaymentOptionCatalog( {
        paymentOptionCatalog,
        serverPayToAddressMap: { 'payTo1': '0x...' },
        serverDefaultMaxTimeoutSeconds: 300,
        contractCatalog
    } )
```

**Returns**
```js
returns { preparedPaymentOptionCatalog }
```

| Key                        | Type   | Description                                                   |
|----------------------------|--------|---------------------------------------------------------------|
| preparedPaymentOptionCatalog | object | Payment options with resolved `payTo` and derived network IDs. |

---

### .getPaymentRequiredResponsePayload()
Generates the full `PaymentRequired` response payload that can be served to the client. Includes scheme, network, amount, asset, payTo, timeout, and EIP-712 domain info.

**Method**
```
static .getPaymentRequiredResponsePayload( { monetizedResourceDescriptor, acceptedPaymentOptionIdList, preparedPaymentOptionCatalog, contractCatalog } )
```

| Key                           | Type             | Description                                                                | Required |
|-------------------------------|------------------|----------------------------------------------------------------------------|----------|
| monetizedResourceDescriptor   | string           | The resource being protected (e.g., API endpoint URL).                     | Yes      |
| acceptedPaymentOptionIdList   | array of strings | List of option IDs from preparedPaymentOptionCatalog to include.           | Yes      |
| preparedPaymentOptionCatalog  | object           | Output from [.getPreparedPaymentOptionCatalog()](#getpreparedpaymentoptioncatalog). | Yes |
| contractCatalog               | object           | Contract definitions for EIP-712 domain info.                              | Yes      |

**Example**
```js
const { paymentRequiredResponsePayload } = ServerExact
    .getPaymentRequiredResponsePayload( {
        monetizedResourceDescriptor: 'https://api.example.com/resource/123',
        acceptedPaymentOptionIdList: [ 'usdc-001' ],
        preparedPaymentOptionCatalog,
        contractCatalog
    } )
```

**Returns**
```js
returns { paymentRequiredResponsePayload }
```

| Key                           | Type   | Description                                                |
|-------------------------------|--------|------------------------------------------------------------|
| paymentRequiredResponsePayload | object | Structured payload to be sent to clients via `PAYMENT-REQUIRED` header. |

---

### .init()
Initializes the ServerExact instance by connecting to the blockchain provider and preparing the contract ABI used for token interaction.

**Method**
```
.init( { providerUrl } )
```

| Key         | Type   | Description                          | Required |
|-------------|--------|--------------------------------------|----------|
| providerUrl | string | Full HTTP URL of the blockchain node | Yes      |

**Example**
```js
const nonceStore = new NonceStore()
const server = new ServerExact( { nonceStore, silent: false } )
    .init( { providerUrl: 'https://base-sepolia.node.provider' } )
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
Sets the wallet private key on the server for transaction signing. Verifies ETH balance against minimum threshold for gas costs.

**Method**
```
async .setWallet( { privateKey, minEth } )
```

| Key        | Type   | Description                                               | Required |
|------------|--------|-----------------------------------------------------------|----------|
| privateKey | string | The private key of the facilitator wallet (with or without `0x`). | Yes |
| minEth     | string | Minimum ETH required for settlement operations. Default: `'0.01'`. | No |

**Example**
```js
await server
    .setWallet( { privateKey: '0x...', minEth: '0.02' } )
```

**Returns**
```js
returns this
```

| Key   | Type        | Description                                   |
|-------|-------------|-----------------------------------------------|
| this  | ServerExact | The same instance for chaining.               |

---

### .decodePaymentSignatureHeader()
Decodes a Base64-encoded `PAYMENT-SIGNATURE` header value received from the client into a usable payment payload object.

**Method**
```
.decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode } )
```

| Key                                | Type   | Description                                           | Required |
|------------------------------------|--------|-------------------------------------------------------|----------|
| paymentSignatureHeaderValueToDecode | string | The Base64-encoded `PAYMENT-SIGNATURE` header value.  | Yes      |

**Example**
```js
const { decodedPaymentSignatureRequestPayload } = server
    .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: headerValue } )
```

**Returns**
```js
returns { decodedPaymentSignatureRequestPayload }
```

| Key                                 | Type   | Description                                    |
|-------------------------------------|--------|------------------------------------------------|
| decodedPaymentSignatureRequestPayload | object | The decoded payment signature payload.         |

---

### .validatePaymentSignatureRequestPayload()
Validates the payment signature payload against the original requirements. Checks resource match, payment option match, amount sufficiency, time window, nonce reuse, and payTo match.

**Method**
```
.validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate, paymentRequiredResponsePayload } )
```

| Key                                          | Type   | Description                                                         | Required |
|----------------------------------------------|--------|---------------------------------------------------------------------|----------|
| decodedPaymentSignatureRequestPayloadToValidate | object | The decoded payload from [.decodePaymentSignatureHeader()](#decodepaymentsignatureheader). | Yes |
| paymentRequiredResponsePayload               | object | The original requirements sent to the client.                       | Yes      |

**Example**
```js
const { paymentSignatureRequestPayloadValidationOutcome } = server
    .validatePaymentSignatureRequestPayload( {
        decodedPaymentSignatureRequestPayloadToValidate: decodedPayload,
        paymentRequiredResponsePayload
    } )

if( !paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
    console.error( paymentSignatureRequestPayloadValidationOutcome.validationIssueList )
}
```

**Returns**
```js
returns { paymentSignatureRequestPayloadValidationOutcome }
```

| Key                                          | Type   | Description                                                       |
|----------------------------------------------|--------|-------------------------------------------------------------------|
| paymentSignatureRequestPayloadValidationOutcome | object | Contains `validationOk`, `validationIssueList`, and `matchedPaymentRequirementsFromClientPayload`. |

---

### .simulateTransaction()
Simulates the token transfer using `eth_call` to detect potential execution errors without sending a transaction.

**Method**
```
async .simulateTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } )
```

| Key                                      | Type   | Description                                                | Required |
|------------------------------------------|--------|------------------------------------------------------------|----------|
| decodedPaymentSignatureRequestPayload    | object | The decoded and validated payment payload.                 | Yes      |
| matchedPaymentRequirementsFromClientPayload | object | The matched requirement from validation outcome.           | Yes      |

**Example**
```js
const { paymentSimulationOutcome } = await server
    .simulateTransaction( {
        decodedPaymentSignatureRequestPayload,
        matchedPaymentRequirementsFromClientPayload
    } )

if( !paymentSimulationOutcome.simulationOk ) {
    console.error( paymentSimulationOutcome.simulationError )
}
```

**Returns**
```js
returns { paymentSimulationOutcome }
```

| Key                     | Type   | Description                                                       |
|-------------------------|--------|-------------------------------------------------------------------|
| paymentSimulationOutcome | object | Contains `simulationOk` (boolean), and optionally `simulationError` and `errorCode`. |

---

### .settleTransaction()
Sends the actual `transferWithAuthorization` transaction to the blockchain. Marks the nonce as used only after successful settlement.

**Method**
```
async .settleTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } )
```

| Key                                      | Type   | Description                                                | Required |
|------------------------------------------|--------|------------------------------------------------------------|----------|
| decodedPaymentSignatureRequestPayload    | object | The decoded and validated payment payload.                 | Yes      |
| matchedPaymentRequirementsFromClientPayload | object | The matched requirement from validation outcome.           | Yes      |

**Example**
```js
const { paymentSettlementOutcome } = await server
    .settleTransaction( {
        decodedPaymentSignatureRequestPayload,
        matchedPaymentRequirementsFromClientPayload
    } )

if( paymentSettlementOutcome.settlementOk ) {
    console.log( 'Transaction:', paymentSettlementOutcome.settlementResponse.transaction )
}
```

**Returns**
```js
returns { paymentSettlementOutcome }
```

| Key                     | Type   | Description                                                       |
|-------------------------|--------|-------------------------------------------------------------------|
| paymentSettlementOutcome | object | Contains `settlementOk`, `settlementResponse`, and optionally `settlementError` and `errorCode`. |

---

### .createPaymentResponseHeader()
Creates the Base64-encoded `PAYMENT-RESPONSE` header value from the settlement response. Sent back to the client with the protected resource.

**Method**
```
.createPaymentResponseHeader( { paymentResponseSettlementPayload } )
```

| Key                            | Type   | Description                                                | Required |
|--------------------------------|--------|------------------------------------------------------------|----------|
| paymentResponseSettlementPayload | object | The settlement response from [.settleTransaction()](#settletransaction). | Yes |

**Example**
```js
const { paymentResponseHeaderValue } = server
    .createPaymentResponseHeader( {
        paymentResponseSettlementPayload: paymentSettlementOutcome.settlementResponse
    } )
```

**Returns**
```js
returns { paymentResponseHeaderValue }
```

| Key                       | Type   | Description                                           |
|---------------------------|--------|-------------------------------------------------------|
| paymentResponseHeaderValue | string | The Base64-encoded `PAYMENT-RESPONSE` header value.   |

---

## METHODS - NonceStore
The `NonceStore` class provides nonce tracking for replay protection. It stores used nonces in memory and checks for reuse during validation.

### .isUsed()
Checks if a nonce key has already been used.

**Method**
```
.isUsed( { nonceKey } )
```

| Key      | Type   | Description                                               | Required |
|----------|--------|-----------------------------------------------------------|----------|
| nonceKey | string | The nonce key in format `{from}-{nonce}` (lowercase).     | Yes      |

**Example**
```js
const used = nonceStore.isUsed( { nonceKey: '0xabc...-0x123...' } )
```

**Returns**
```js
returns boolean
```

| Key     | Type    | Description                          |
|---------|---------|--------------------------------------|
| (value) | boolean | `true` if nonce was used, `false` otherwise. |

---

### .markUsed()
Marks a nonce key as used. Called after successful settlement to prevent replay.

**Method**
```
.markUsed( { nonceKey } )
```

| Key      | Type   | Description                                               | Required |
|----------|--------|-----------------------------------------------------------|----------|
| nonceKey | string | The nonce key in format `{from}-{nonce}` (lowercase).     | Yes      |

**Example**
```js
nonceStore.markUsed( { nonceKey: '0xabc...-0x123...' } )
```

**Returns**
```js
returns void
```



## Contribution

Contributions are welcome!
If you encounter bugs, have feature suggestions, or want to improve the module, feel free to open an issue or submit a pull request.


## License

This project is licensed under the MIT License.
See the [LICENSE](../../LICENSE) file for details.
