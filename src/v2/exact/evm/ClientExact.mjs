// v2 ClientExact - Placeholder
// This module will implement the v2 exact scheme for EVM networks.
// v2 separates Types / Logic / Representation and uses new HTTP headers:
// - PAYMENT-REQUIRED
// - PAYMENT-SIGNATURE
// - PAYMENT-RESPONSE (Base64)


class ClientExact {
    constructor( { silent = false } = {} ) {
        throw new Error( 'ClientExact v2 is not yet implemented. Use legacy import for v1.' )
    }
}


export { ClientExact }
