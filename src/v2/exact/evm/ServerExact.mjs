// v2 ServerExact - Placeholder
// This module will implement the v2 exact scheme for EVM networks.
// v2 separates Types / Logic / Representation and uses new HTTP headers:
// - PAYMENT-REQUIRED
// - PAYMENT-SIGNATURE
// - PAYMENT-RESPONSE (Base64)


class ServerExact {
    constructor( { nonceStore, silent = false } = {} ) {
        throw new Error( 'ServerExact v2 is not yet implemented. Use legacy import for v1.' )
    }
}


export { ServerExact }
