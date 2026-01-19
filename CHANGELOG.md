# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Versioned exports**: Root now exports `v1`, `v2`, and `legacy` namespaces
- **v2 scaffold**: Placeholder implementation for v2 (Types / Logic / Representation separation)
- **Legacy entry point**: `x402-core/legacy` provides stable access to v1 functionality
- **Documentation structure**: Separate docs for v1 and v2
- **Migration guide**: `MIGRATION.md` with import path migration instructions
- **v2 test template**: `tests/v2/1-full-process.mjs` (gated until v2 is implemented)

### Changed

- **BREAKING**: Root export no longer directly exposes `ClientExact`, `ServerExact`, `NonceStore`
- **Directory structure**: v1 code moved to `src/v1/exact/evm/`
- **Test structure**: v1 tests moved to `tests/v1/`
- **CI imports**: Updated to use `x402-core/legacy`

### Migration

Users must update imports:

```js
// Old (no longer works)
import { ClientExact, ServerExact, NonceStore } from 'x402-core'

// New (recommended)
import { ClientExact, ServerExact, NonceStore } from 'x402-core/legacy'
```

See [MIGRATION.md](./MIGRATION.md) for details.

## [1.0.0] - Previous Release

### Features

- EVM exact scheme implementation using EIP-3009
- `ClientExact` for client-side authorization creation
- `ServerExact` for server-side validation and settlement
- `NonceStore` for replay protection
- `X-PAYMENT` header format
