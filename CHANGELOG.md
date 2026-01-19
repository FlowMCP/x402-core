# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **v2 exact/evm implementation**: Complete implementation of X402 v2 spec for EVM networks
- **v2 Types**: `PaymentRequired`, `PaymentPayload`, `SettlementResponse` with validators
- **v2 HTTP Transport**: Base64 JSON headers (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`)
- **Config Model**: `contractCatalog` + `paymentOptionCatalog` for cleaner configuration
- **Multi-network Selection**: Deterministic policy-based payment option selection
- **Validation Issue List**: Structured validation errors with paths and spec error codes
- **Error Codes**: Spec-compliant error codes (`invalid_payload`, `invalid_network`, etc.)
- **Network ID Format**: CAIP-2 format (`eip155:<chainId>`)
- **v2 E2E Tests**: Success and failure case tests at `tests/v2/1-full-process.mjs`
- **v2 Documentation**: Comprehensive API documentation at `docs/v2/README.md`
- **Versioned exports**: Root now exports `v1`, `v2`, and `legacy` namespaces
- **Legacy entry point**: `x402-core/legacy` provides stable access to v1 functionality
- **Documentation structure**: Separate docs for v1 and v2
- **Migration guide**: `MIGRATION.md` with import path migration instructions

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
