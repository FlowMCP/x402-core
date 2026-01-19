# Migration Guide

This document describes how to migrate from the old x402-core import paths to the new versioned structure.

## Breaking Change

As of this release, x402-core now uses versioned exports. The root export no longer directly exposes `ClientExact`, `ServerExact`, and `NonceStore`. Instead, you must explicitly import from a version namespace.

## Import Path Changes

### Old Import (no longer works)

```js
// This will no longer work!
import { ClientExact, ServerExact, NonceStore } from 'x402-core'
```

### New Imports

#### Option 1: Legacy Path (Recommended for existing code)

```js
// Use the legacy entry point - same functionality, explicit path
import { ClientExact, ServerExact, NonceStore } from 'x402-core/legacy'
```

#### Option 2: Version-specific Path

```js
// Import from the specific version and scheme
import { ClientExact, ServerExact, NonceStore } from 'x402-core/v1/exact/evm'
```

#### Option 3: Namespace Imports

```js
// Import namespaces and access classes
import { v1, legacy } from 'x402-core'

// Via v1 namespace
const { ClientExact, ServerExact, NonceStore } = v1.exact.evm

// Via legacy namespace (same classes)
const { ClientExact, ServerExact, NonceStore } = legacy
```

## Migration Steps

1. **Find all imports** of `x402-core` in your codebase
2. **Update import paths** to use `x402-core/legacy`
3. **Test** to ensure everything works as before

### Example Migration

**Before:**
```js
import { ServerExact, NonceStore } from 'x402-core'
```

**After:**
```js
import { ServerExact, NonceStore } from 'x402-core/legacy'
```

## Middleware Migration

If you're using `x402-mcp-middleware`, update your imports:

**Before:**
```js
import { ServerExact, NonceStore } from 'x402-core'
import { ClientExact } from 'x402-core'
```

**After:**
```js
import { ServerExact, NonceStore } from 'x402-core/legacy'
import { ClientExact } from 'x402-core/legacy'
```

## Why This Change?

The versioned structure allows:

1. **Clear separation** between v1 and v2 implementations
2. **Future-proofing** for additional schemes (deferred) and networks (Solana, Aptos, Sui)
3. **Explicit opt-in** to new versions without breaking existing code
4. **Legacy support** via dedicated entry point

## Questions?

If you encounter issues during migration, please open an issue on GitHub.
