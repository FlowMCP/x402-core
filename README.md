[![Test](https://img.shields.io/github/actions/workflow/status/FlowMCP/x402-core/test-on-release.yml)](https://github.com/FlowMCP/x402-core/actions) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# x402-core

Authorization-based payment layer for web services using EIP-3009 signed token authorizations.

## Overview

x402-core provides client and server-side building blocks for token-based payment flows. **v2 introduces multi-chain support**, enabling servers to accept payments from multiple blockchains simultaneously while clients can filter options by their supported networks.

## Key Features (v2)

- **Multi-Chain Support**: Server accepts payments from multiple EVM chains (Base, Avalanche, Ethereum, etc.)
- **Client Network Filtering**: Clients specify supported networks, automatically filtering incompatible options
- **Flexible Payment Options**: Mix payment options across different chains with different prices
- **CAIP-2 Network IDs**: Standard network identification (`eip155:84532`, `eip155:43113`, etc.)
- **EIP-3009 Authorization**: Gas-efficient, trust-minimized payment signatures

## Documentation

| Document | Description |
|----------|-------------|
| [docs/v1/README.md](./docs/v1/README.md) | Legacy v1 documentation (frozen) - EVM exact scheme |
| [docs/v2/README.md](./docs/v2/README.md) | v2 documentation - Multi-chain support |
| [MIGRATION.md](./MIGRATION.md) | Migration guide from v1 to new import paths |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and changes |

## Quick Start

### v2 - Multi-Chain (recommended)

```js
import { ClientExact, ServerExact, NonceStore } from 'x402-core/v2/exact/evm'
```

**Server Configuration (Multi-Chain):**

```js
const multiChainConfig = {
    contractCatalog: {
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
        },
        'usdc-ethereum-sepolia': {
            paymentNetworkId: 'eip155:11155111',
            address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            decimals: 6,
            domainName: 'USDC',
            domainVersion: '2'
        }
    },
    paymentOptionCatalog: {
        'option-base-10k':  { contractId: 'usdc-base-sepolia',     amount: '10000', payTo: '{{payTo1}}' },
        'option-avax-10k':  { contractId: 'usdc-avalanche-fuji',   amount: '10000', payTo: '{{payTo1}}' },
        'option-eth-10k':   { contractId: 'usdc-ethereum-sepolia', amount: '10000', payTo: '{{payTo1}}' },
        'option-avax-5k':   { contractId: 'usdc-avalanche-fuji',   amount: '5000',  payTo: '{{payTo1}}' }  // Different price!
    },
    acceptedPaymentOptionIdList: [ 'option-base-10k', 'option-avax-10k', 'option-eth-10k', 'option-avax-5k' ]
}
```

**Client Selection (Network Filtering):**

```js
// Client only supports Base Sepolia
const { selectedPaymentRequirements } = ClientExact.selectMatchingPaymentOption( {
    paymentRequiredResponsePayload,
    clientSupportedPaymentNetworkIdList: [ 'eip155:84532' ],
    clientAllowedAssetConstraintList: [
        { asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmount: '1000000' }
    ]
} )
// → Automatically selects option-base-10k, ignores Avalanche/Ethereum options
```

### Legacy v1 (frozen)

```js
// Use the legacy import for v1 functionality
import { ClientExact, ServerExact, NonceStore } from 'x402-core/legacy'
```

### Namespace Imports

```js
// Import specific versions via namespaces
import { v1, v2, legacy } from 'x402-core'

// Access v2 exact EVM classes
const { ClientExact, ServerExact, NonceStore } = v2.exact.evm
```

## Structure

```
x402-core/
  src/
    v1/                    # v1 implementation (frozen)
      exact/
        evm/               # EVM exact scheme
    v2/                    # v2 implementation (multi-chain)
      exact/
        evm/               # EVM exact scheme
      config/              # ConfigValidator
      types/               # Core types
      transports/          # Transport layer (HTTP/MCP/A2A)
    legacy/                # Legacy entry point (re-exports v1)
  docs/
    v1/                    # v1 documentation
    v2/                    # v2 documentation
  tests/
    v1/                    # v1 regression tests
    v2/                    # v2 multi-chain tests
```

## Version Support

| Version | Status | Import Path | Multi-Chain |
|---------|--------|-------------|-------------|
| v1 | Frozen | `x402-core/legacy` | No |
| v2 | Stable | `x402-core/v2/exact/evm` | Yes |

## Multi-Chain Test

Run the full multi-chain test with real settlement:

```bash
node tests/v2/1-full-process.mjs
```

**Test Output:**

```
═══════════════════════════════════════════════════════════════════
  MULTI-CHAIN PAYMENT OPTIONS TEST
═══════════════════════════════════════════════════════════════════

1️⃣  SERVER: Building PaymentRequired with mixed blockchain options...

   Server offers 4 payment options:

   [1] Base Sepolia     | 0.01 USDC | 0x036CbD53...
   [2] Avalanche Fuji   | 0.01 USDC | 0x54258902...
   [3] Ethereum Sepolia | 0.01 USDC | 0x1c7D4B19...
   [4] Avalanche Fuji   | 0.01 USDC | 0x54258902...

─────────────────────────────────────────────────────────────────────
2️⃣  CLIENT A: Only supports Base Sepolia

   Supported networks: eip155:84532
   Filtered by network: 3 options removed
   Candidates after filter: 1
   ✅ Selected: eip155:84532 - 10000 units

─────────────────────────────────────────────────────────────────────
3️⃣  CLIENT B: Only supports Avalanche Fuji

   Supported networks: eip155:43113
   Filtered by network: 2 options removed
   Candidates after filter: 2
   ✅ Selected: eip155:43113 - 10000 units

─────────────────────────────────────────────────────────────────────
4️⃣  CLIENT C: Supports MULTIPLE chains (Base + Avalanche)

   Supported networks: eip155:84532, eip155:43113
   Filtered by network: 1 options removed
   Candidates after filter: 3 (multiple options available!)
   ✅ Selected: eip155:84532 - 10000 units

─────────────────────────────────────────────────────────────────────
6️⃣  FULL FLOW: Execute payment on Base Sepolia

   Client selected: eip155:84532
   ✅ Settlement successful!
   Transaction: 0x...
   Network: eip155:84532

═══════════════════════════════════════════════════════════════════
  TEST COMPLETE - Multi-Chain Payment Options Work!
═══════════════════════════════════════════════════════════════════
```

## Contribution

Contributions are welcome!
If you encounter bugs, have feature suggestions, or want to improve the module, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
See the [LICENSE](./LICENSE) file for details.
