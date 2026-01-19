[![Test](https://img.shields.io/github/actions/workflow/status/FlowMCP/x402-core/test-on-release.yml)](https://github.com/FlowMCP/x402-core/actions) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# x402-core

Authorization-based payment layer for web services using EIP-3009 signed token authorizations.

## Overview

x402-core provides client and server-side building blocks for token-based payment flows. It supports multiple protocol versions and network kinds, enabling secure, gas-efficient, and trust-minimized payments.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/v1/README.md](./docs/v1/README.md) | Legacy v1 documentation (frozen) - EVM exact scheme |
| [docs/v2/README.md](./docs/v2/README.md) | v2 documentation (in development) |
| [MIGRATION.md](./MIGRATION.md) | Migration guide from v1 to new import paths |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and changes |

## Quick Start

### Legacy v1 (stable)

```js
// Use the legacy import for v1 functionality
import { ClientExact, ServerExact, NonceStore } from 'x402-core/legacy'
```

### Namespace Imports

```js
// Import specific versions via namespaces
import { v1, v2, legacy } from 'x402-core'

// Access v1 exact EVM classes
const { ClientExact, ServerExact, NonceStore } = v1.exact.evm
```

## Structure

```
x402-core/
  src/
    v1/                    # v1 implementation (frozen)
      exact/
        evm/               # EVM exact scheme
    v2/                    # v2 implementation (scaffold)
      exact/
        evm/               # EVM exact scheme
      types/               # Core types
      transports/          # Transport layer (HTTP/MCP/A2A)
    legacy/                # Legacy entry point (re-exports v1)
  docs/
    v1/                    # v1 documentation
    v2/                    # v2 documentation
  tests/
    v1/                    # v1 regression tests
    v2/                    # v2 test templates
```

## Version Support

| Version | Status | Import Path |
|---------|--------|-------------|
| v1 | Stable (frozen) | `x402-core/legacy` or `x402-core/v1/exact/evm` |
| v2 | In Development | `x402-core/v2/exact/evm` |

## Contribution

Contributions are welcome!
If you encounter bugs, have feature suggestions, or want to improve the module, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
See the [LICENSE](./LICENSE) file for details.
