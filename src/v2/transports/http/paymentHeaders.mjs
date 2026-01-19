// Payment Headers v2 Codec
// Implements encode/decode for PAYMENT-REQUIRED, PAYMENT-SIGNATURE, PAYMENT-RESPONSE headers

import { Base64JsonCodec } from './base64JsonCodec.mjs'


class PaymentHeaders {
    // PAYMENT-REQUIRED Header (Server -> Client)
    static encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode } ) {
        const { base64String, encodeError } = Base64JsonCodec
            .encodeBase64Json( { plainObjectToEncode: paymentRequiredResponsePayloadToEncode } )

        if( encodeError ) {
            throw new Error( `Failed to encode PAYMENT-REQUIRED header: ${encodeError.errorMessage}` )
        }

        return { paymentRequiredHeaderValue: base64String }
    }


    static decodePaymentRequiredHeaderValue( { paymentRequiredHeaderValueToDecode } ) {
        const { decodedPlainObject, decodeError } = Base64JsonCodec
            .decodeBase64Json( { base64StringToDecode: paymentRequiredHeaderValueToDecode } )

        if( decodeError ) {
            throw new Error( `Failed to decode PAYMENT-REQUIRED header: ${decodeError.errorMessage}` )
        }

        return { decodedPaymentRequiredResponsePayload: decodedPlainObject }
    }


    // PAYMENT-SIGNATURE Header (Client -> Server)
    static encodePaymentSignatureHeaderValue( { paymentSignatureRequestPayloadToEncode } ) {
        const { base64String, encodeError } = Base64JsonCodec
            .encodeBase64Json( { plainObjectToEncode: paymentSignatureRequestPayloadToEncode } )

        if( encodeError ) {
            throw new Error( `Failed to encode PAYMENT-SIGNATURE header: ${encodeError.errorMessage}` )
        }

        return { paymentSignatureHeaderValue: base64String }
    }


    static decodePaymentSignatureHeaderValue( { paymentSignatureHeaderValueToDecode } ) {
        const { decodedPlainObject, decodeError } = Base64JsonCodec
            .decodeBase64Json( { base64StringToDecode: paymentSignatureHeaderValueToDecode } )

        if( decodeError ) {
            throw new Error( `Failed to decode PAYMENT-SIGNATURE header: ${decodeError.errorMessage}` )
        }

        return { decodedPaymentSignatureRequestPayload: decodedPlainObject }
    }


    // PAYMENT-RESPONSE Header (Server -> Client)
    static encodePaymentResponseHeaderValue( { paymentResponseSettlementPayloadToEncode } ) {
        const { base64String, encodeError } = Base64JsonCodec
            .encodeBase64Json( { plainObjectToEncode: paymentResponseSettlementPayloadToEncode } )

        if( encodeError ) {
            throw new Error( `Failed to encode PAYMENT-RESPONSE header: ${encodeError.errorMessage}` )
        }

        return { paymentResponseHeaderValue: base64String }
    }


    static decodePaymentResponseHeaderValue( { paymentResponseHeaderValueToDecode } ) {
        const { decodedPlainObject, decodeError } = Base64JsonCodec
            .decodeBase64Json( { base64StringToDecode: paymentResponseHeaderValueToDecode } )

        if( decodeError ) {
            throw new Error( `Failed to decode PAYMENT-RESPONSE header: ${decodeError.errorMessage}` )
        }

        return { decodedPaymentResponseSettlementPayload: decodedPlainObject }
    }
}


export { PaymentHeaders }
