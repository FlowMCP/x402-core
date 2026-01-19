# x402-core v2 Documentation

> **Status: In Development**
> v2 is currently a scaffold. Implementation is in progress.

## Overview

v2 introduces a cleaner architectural separation:

- **Types**: Core type definitions (`PaymentRequired`, `PaymentPayload`, `SettlementResponse`)
- **Logic**: Payment logic separated by Scheme and Network Kind
- **Representation**: Transport-layer encoding (HTTP headers, MCP, A2A)

## Architecture

### Directory Structure

```
src/v2/
  exact/
    evm/
      ClientExact.mjs    # EVM client implementation
      ServerExact.mjs    # EVM server implementation
      index.mjs
    index.mjs
  types/
    index.mjs            # Core types
  transports/
    index.mjs            # HTTP/MCP/A2A transports
  index.mjs
```

### Key Changes from v1

| Aspect | v1 | v2 |
|--------|-----|-----|
| HTTP Headers | `X-PAYMENT` (JSON) | `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` (Base64) |
| Architecture | Monolithic | Types / Logic / Representation separation |
| Transport | HTTP only | HTTP, MCP, A2A |

## HTTP v2 Headers

v2 uses explicit, Base64-encoded headers:

- `PAYMENT-REQUIRED`: Server advertises payment requirements
- `PAYMENT-SIGNATURE`: Client sends signed authorization
- `PAYMENT-RESPONSE`: Server responds with settlement result

## Import Paths

```js
// v2 exact EVM (when implemented)
import { ClientExact, ServerExact } from 'x402-core/v2/exact/evm'

// v2 types
import { PaymentRequired, PaymentPayload, SettlementResponse } from 'x402-core/v2/types'

// v2 transports
import { HTTP, MCP, A2A } from 'x402-core/v2/transports'
```

## Migration from v1

See [MIGRATION.md](../../MIGRATION.md) for detailed migration guidance.

## Testing

v2 tests are located at `tests/v2/1-full-process.mjs`.

To run v2 tests when implemented:

```bash
X402_V2=1 node tests/v2/1-full-process.mjs
```

## Roadmap

- [ ] Core types implementation
- [ ] EVM exact scheme implementation
- [ ] HTTP transport with Base64 headers
- [ ] MCP transport
- [ ] A2A transport
- [ ] Multichain support (Solana, Aptos, Sui)
