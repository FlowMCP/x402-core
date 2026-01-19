# x402-core v2 Documentation

> **Status: Implemented**
> v2 exact scheme for EVM (`eip155:*`) is now fully implemented.

## Overview

v2 introduces a cleaner architectural separation:

- **Types**: Core type definitions (`PaymentRequired`, `PaymentPayload`, `SettlementResponse`)
- **Logic**: Payment logic separated by Scheme and Network Kind
- **Representation**: Transport-layer encoding (HTTP headers with Base64 JSON)

## Architecture

### Directory Structure

```
src/v2/
  exact/
    evm/
      ClientExact.mjs      # EVM client implementation
      ServerExact.mjs      # EVM server implementation
      selectionPolicy.mjs  # Payment option selection
      evmNetworkParsing.mjs # Network ID parsing
      index.mjs
    index.mjs
  types/
    PaymentRequired.mjs    # PaymentRequired type & validator
    PaymentPayload.mjs     # PaymentPayload type & validator
    SettlementResponse.mjs # SettlementResponse type & helpers
    index.mjs
  transports/
    http/
      base64JsonCodec.mjs  # Base64 JSON encoding
      paymentHeaders.mjs   # PAYMENT-* header codecs
      index.mjs
    index.mjs
  errors/
    errorCodes.mjs         # Spec error codes
    validationIssues.mjs   # Validation issue helpers
    index.mjs
  config/
    validateX402V2ExactEvmConfiguration.mjs
    index.mjs
  index.mjs
```

## Key Changes from v1

| Aspect | v1 | v2 |
|--------|-----|-----|
| HTTP Headers | `X-PAYMENT` (JSON) | `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` (Base64) |
| Architecture | Monolithic | Types / Logic / Representation separation |
| Network ID | `chainId` string | `eip155:<chainId>` (CAIP-2 format) |
| Config Model | Inline options | `contractCatalog` + `paymentOptionCatalog` |
| Selection | First match | Deterministic policy-based selection |
| Validation | Simple checks | Issue list with paths and spec error codes |

## Configuration Model

### Contract Catalog

Define token contracts once with their network and domain info:

```js
const contractCatalog = {
    'usdc-base-sepolia': {
        paymentNetworkId: 'eip155:84532',
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        decimals: 6,
        domainName: 'USDC',
        domainVersion: '2'
    },
    'usdc-avalanche-fuji': {
        paymentNetworkId: 'eip155:43113',
        address: '0x5425890298aed601595a70AB815c96711a31Bc65',
        decimals: 6,
        domainName: 'USDC',
        domainVersion: '2'
    }
}
```

### Payment Option Catalog

Reference contracts and define payment terms:

```js
const paymentOptionCatalog = {
    'option-001': {
        contractId: 'usdc-base-sepolia',
        amount: '10000',           // Atomic units (0.01 USDC)
        payTo: '{{payTo1}}',       // Alias resolved from serverPayToAddressMap
        maxTimeoutSeconds: 300,
        assetTransferMethod: 'transferWithAuthorization'
    },
    'option-002': {
        contractId: 'usdc-avalanche-fuji',
        amount: '50000',
        payTo: '{{payTo1}}',
        maxTimeoutSeconds: 600
    }
}
```

### Server PayTo Address Map

Resolve `{{alias}}` placeholders:

```js
const serverPayToAddressMap = {
    'payTo1': '0xYourServerAddress...',
    'payTo2': '0xAnotherAddress...'
}
```

## HTTP v2 Headers

v2 uses explicit, Base64-encoded JSON headers:

| Header | Direction | Content |
|--------|-----------|---------|
| `PAYMENT-REQUIRED` | Server -> Client | PaymentRequired object |
| `PAYMENT-SIGNATURE` | Client -> Server | PaymentPayload object |
| `PAYMENT-RESPONSE` | Server -> Client | SettlementResponse object |

### Encoding/Decoding

```js
import { PaymentHeaders } from 'x402-core/v2/transports/http'

// Encode
const { paymentRequiredHeaderValue } = PaymentHeaders
    .encodePaymentRequiredHeaderValue( {
        paymentRequiredResponsePayloadToEncode: payload
    } )

// Decode
const { decodedPaymentRequiredResponsePayload } = PaymentHeaders
    .decodePaymentRequiredHeaderValue( {
        paymentRequiredHeaderValueToDecode: headerValue
    } )
```

## Selection Policy

The client uses a deterministic selection policy when multiple payment options are available:

```js
const policy = {
    preferredNetworkOrder: [ 'eip155:43113', 'eip155:84532' ],
    preferredAssetOrder: [ '0xUSDC...', '0xUSDT...' ],
    tieBreaker: 'lowest-amount'
}

const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientAllowedAssetConstraintList,
        clientSupportedPaymentNetworkIdList,
        paymentOptionSelectionPolicy: policy
    } )
```

### Selection Diagnostics

The diagnostics object provides visibility into the selection process:

```js
{
    totalServerOptions: 3,
    filteredByScheme: 0,
    filteredByNetwork: 1,
    filteredByAsset: 0,
    candidatesAfterFilter: 2,
    selectionReason: 'policy_selected'
}
```

## Validation Issue List

All validators return an issue list with structured error information:

```js
const { validationOk, validationIssueList } = outcome

// Example issue:
{
    issuePath: 'payload.authorization.validBefore',
    issueCode: 'invalid_exact_evm_payload_timeout',
    issueMessage: 'Authorization has expired'
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `invalid_payload` | General payload structure error |
| `invalid_payment_requirements` | Requirements don't match |
| `invalid_network` | Network not supported |
| `invalid_exact_evm_payload_timeout` | Time window invalid |
| `invalid_exact_evm_payload_nonce` | Nonce already used |
| `invalid_exact_evm_payload_signature` | Signature verification failed |
| `simulation_failed` | Transaction simulation failed |
| `settlement_failed` | Settlement transaction failed |
| `no_matching_payment_option` | No payment option matches client constraints |

## Server API

### Static Methods

```js
// Prepare payment options (resolve aliases, derive networks)
const { preparedPaymentOptionCatalog } = ServerExact
    .getPreparedPaymentOptionCatalog( {
        paymentOptionCatalog,
        serverPayToAddressMap,
        serverDefaultMaxTimeoutSeconds: 300,
        contractCatalog
    } )

// Build PaymentRequired response
const { paymentRequiredResponsePayload } = ServerExact
    .getPaymentRequiredResponsePayload( {
        monetizedResourceDescriptor: 'https://api.example.com/resource',
        acceptedPaymentOptionIdList: [ 'option-001', 'option-002' ],
        preparedPaymentOptionCatalog,
        contractCatalog
    } )
```

### Instance Methods

```js
const nonceStore = new NonceStore()
const server = new ServerExact( { nonceStore, silent: true } )
    .init( { providerUrl: 'https://...' } )
await server.setWallet( { privateKey: '0x...' } )

// Decode PAYMENT-SIGNATURE header
const { decodedPaymentSignatureRequestPayload } = server
    .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode } )

// Validate payment
const { paymentSignatureRequestPayloadValidationOutcome } = server
    .validatePaymentSignatureRequestPayload( {
        decodedPaymentSignatureRequestPayloadToValidate,
        paymentRequiredResponsePayload
    } )

// Simulate transaction
const { paymentSimulationOutcome } = await server
    .simulateTransaction( {
        decodedPaymentSignatureRequestPayload,
        matchedPaymentRequirementsFromClientPayload
    } )

// Settle transaction
const { paymentSettlementOutcome } = await server
    .settleTransaction( {
        decodedPaymentSignatureRequestPayload,
        matchedPaymentRequirementsFromClientPayload
    } )

// Create PAYMENT-RESPONSE header
const { paymentResponseHeaderValue } = server
    .createPaymentResponseHeader( { paymentResponseSettlementPayload } )
```

## Client API

### Static Methods

```js
// Validate PaymentRequired
const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
    .validatePaymentRequiredResponsePayload( {
        paymentRequiredResponsePayloadToValidate
    } )

// Select matching payment option
const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientAllowedAssetConstraintList: [
            { asset: '0x...', maxAmount: '1000000' }
        ],
        clientSupportedPaymentNetworkIdList: [ 'eip155:84532' ],
        paymentOptionSelectionPolicy: null
    } )

// Create PaymentPayload
const { paymentPayload } = ClientExact
    .createPaymentPayloadObject( {
        resource: 'https://...',
        selectedPaymentRequirements,
        exactEvmAuthorizationPayload,
        exactEvmAuthorizationSignature
    } )
```

### Instance Methods

```js
const client = new ClientExact( { silent: true } )
    .init( { providerUrl: 'https://...' } )
await client.setWallet( { privateKey: '0x...' } )

// Decode PAYMENT-REQUIRED header
const { decodedPaymentRequiredResponsePayload } = client
    .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode } )

// Create EIP-3009 authorization
const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
    .createAuthorization( {
        selectedPaymentRequirements,
        exactEvmAuthorizationTimeWindowDefinition: {
            validAfterOffsetSeconds: -30,
            validBeforeOffsetSeconds: null
        }
    } )

// Create PAYMENT-SIGNATURE header
const { paymentSignatureHeaderValue } = client
    .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode } )
```

## Import Paths

```js
// v2 exact EVM
import { ClientExact, ServerExact, NonceStore } from 'x402-core/v2/exact/evm'
import { EvmNetworkParsing, SelectionPolicy } from 'x402-core/v2/exact/evm'

// v2 types
import { PaymentRequired, PaymentPayload, SettlementResponse } from 'x402-core/v2/types'

// v2 transports
import { PaymentHeaders, Base64JsonCodec } from 'x402-core/v2/transports/http'

// v2 errors
import { ErrorCodes, ValidationIssues } from 'x402-core/v2/errors'

// v2 config validation
import { ConfigValidator } from 'x402-core/v2/config'
```

## Testing

v2 tests are located at `tests/v2/1-full-process.mjs`.

To run v2 tests:

```bash
npm run test:v2
```

The test includes:
- Success case: Full payment flow with settlement
- Failure case: Client rejects unsupported network

## Migration from v1

See [MIGRATION.md](../../MIGRATION.md) for detailed migration guidance.

## Roadmap

- [x] Core types implementation
- [x] EVM exact scheme implementation
- [x] HTTP transport with Base64 headers
- [x] Multi-network selection policy
- [x] Validation with issue list
- [x] E2E tests
- [ ] MCP transport
- [ ] A2A transport
- [ ] Additional networks (Solana, Aptos, Sui)
