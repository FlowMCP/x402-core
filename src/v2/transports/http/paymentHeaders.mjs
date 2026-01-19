// Payment Headers v2 Codec
// Implements encode/decode for PAYMENT-REQUIRED, PAYMENT-SIGNATURE, PAYMENT-RESPONSE headers

import { Base64JsonCodec } from './base64JsonCodec.mjs'


class PaymentHeaders {
    // PAYMENT-REQUIRED Header (Server -> Client)
    static encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode } ) {
        const { base64String } = Base64JsonCodec
            .encodeBase64Json( { plainObjectToEncode: paymentRequiredResponsePayloadToEncode } )

        return { paymentRequiredHeaderValue: base64String }
    }


    static decodePaymentRequiredHeaderValue( { paymentRequiredHeaderValueToDecode } ) {
        const { decodedPlainObject } = Base64JsonCodec
            .decodeBase64Json( { base64StringToDecode: paymentRequiredHeaderValueToDecode } )

        return { decodedPaymentRequiredResponsePayload: decodedPlainObject }
    }


    // PAYMENT-SIGNATURE Header (Client -> Server)
    static encodePaymentSignatureHeaderValue( { paymentSignatureRequestPayloadToEncode } ) {
        const { base64String } = Base64JsonCodec
            .encodeBase64Json( { plainObjectToEncode: paymentSignatureRequestPayloadToEncode } )

        return { paymentSignatureHeaderValue: base64String }
    }


    static decodePaymentSignatureHeaderValue( { paymentSignatureHeaderValueToDecode } ) {
        const { decodedPlainObject } = Base64JsonCodec
            .decodeBase64Json( { base64StringToDecode: paymentSignatureHeaderValueToDecode } )

        return { decodedPaymentSignatureRequestPayload: decodedPlainObject }
    }


    // PAYMENT-RESPONSE Header (Server -> Client)
    static encodePaymentResponseHeaderValue( { paymentResponseSettlementPayloadToEncode } ) {
        const { base64String } = Base64JsonCodec
            .encodeBase64Json( { plainObjectToEncode: paymentResponseSettlementPayloadToEncode } )

        return { paymentResponseHeaderValue: base64String }
    }


    static decodePaymentResponseHeaderValue( { paymentResponseHeaderValueToDecode } ) {
        const { decodedPlainObject } = Base64JsonCodec
            .decodeBase64Json( { base64StringToDecode: paymentResponseHeaderValueToDecode } )

        return { decodedPaymentResponseSettlementPayload: decodedPlainObject }
    }
}


export { PaymentHeaders }
