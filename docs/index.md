# x402-core Documentation Index

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Root README](../README.md) | Project overview and quick start |
| [v1 Documentation](./v1/README.md) | Legacy v1 (EVM exact scheme) - frozen |
| [v2 Documentation](./v2/README.md) | v2 (in development) |
| [Migration Guide](../MIGRATION.md) | How to migrate import paths |
| [Changelog](../CHANGELOG.md) | Version history |

## Version Overview

### v1 (Legacy - Frozen)

The original implementation supporting:
- EVM networks (e.g., Base Sepolia)
- Exact scheme (EIP-3009 `transferWithAuthorization`)
- `X-PAYMENT` JSON headers

**Import:**
```js
import { ClientExact, ServerExact, NonceStore } from 'x402-core/legacy'
```

### v2 (In Development)

The next-generation implementation featuring:
- Types / Logic / Representation separation
- Multiple transport layers (HTTP, MCP, A2A)
- Base64-encoded headers
- Multichain preparation

**Import (when ready):**
```js
import { ClientExact, ServerExact } from 'x402-core/v2/exact/evm'
```

## Directory Structure

```
x402-core/
  src/
    v1/exact/evm/         # v1 implementation
    v2/                    # v2 scaffold
    legacy/                # Legacy entry point
  docs/
    v1/README.md          # v1 docs
    v2/README.md          # v2 docs
    index.md              # This file
  tests/
    v1/                    # v1 tests
    v2/                    # v2 tests
```

## Related Projects

- [x402-mcp-middleware](https://github.com/FlowMCP/x402-mcp-middleware) - MCP middleware using x402-core
