import { describe, test, expect } from '@jest/globals'
import { PaymentHeaders } from '../../src/v2/transports/http/paymentHeaders.mjs'


describe( 'PaymentHeaders', () => {
    const samplePaymentRequired = {
        x402Version: 2,
        accepts: [ { scheme: 'exact', network: 'eip155:8453', amount: '1000000' } ]
    }

    const samplePaymentSignature = {
        x402Version: 2,
        scheme: 'exact',
        network: 'eip155:8453',
        payload: { signature: '0xdeadbeef' }
    }

    const samplePaymentResponse = {
        success: true,
        transactionHash: '0xabcdef'
    }


    describe( 'PAYMENT-REQUIRED header', () => {
        test( 'encodes payment required payload', () => {
            const { paymentRequiredHeaderValue } = PaymentHeaders
                .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: samplePaymentRequired } )

            expect( typeof paymentRequiredHeaderValue ).toBe( 'string' )
            expect( paymentRequiredHeaderValue.length ).toBeGreaterThan( 0 )
        } )


        test( 'decodes payment required header value', () => {
            const { paymentRequiredHeaderValue } = PaymentHeaders
                .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: samplePaymentRequired } )

            const { decodedPaymentRequiredResponsePayload } = PaymentHeaders
                .decodePaymentRequiredHeaderValue( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

            expect( decodedPaymentRequiredResponsePayload ).toEqual( samplePaymentRequired )
        } )


        test( 'throws on null encode input', () => {
            expect( () => {
                PaymentHeaders.encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: null } )
            } ).toThrow( 'Failed to encode PAYMENT-REQUIRED header' )
        } )


        test( 'throws on invalid decode input', () => {
            expect( () => {
                PaymentHeaders.decodePaymentRequiredHeaderValue( { paymentRequiredHeaderValueToDecode: null } )
            } ).toThrow( 'Failed to decode PAYMENT-REQUIRED header' )
        } )
    } )


    describe( 'PAYMENT-SIGNATURE header', () => {
        test( 'encodes payment signature payload', () => {
            const { paymentSignatureHeaderValue } = PaymentHeaders
                .encodePaymentSignatureHeaderValue( { paymentSignatureRequestPayloadToEncode: samplePaymentSignature } )

            expect( typeof paymentSignatureHeaderValue ).toBe( 'string' )
        } )


        test( 'decodes payment signature header value', () => {
            const { paymentSignatureHeaderValue } = PaymentHeaders
                .encodePaymentSignatureHeaderValue( { paymentSignatureRequestPayloadToEncode: samplePaymentSignature } )

            const { decodedPaymentSignatureRequestPayload } = PaymentHeaders
                .decodePaymentSignatureHeaderValue( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

            expect( decodedPaymentSignatureRequestPayload ).toEqual( samplePaymentSignature )
        } )


        test( 'throws on null encode input', () => {
            expect( () => {
                PaymentHeaders.encodePaymentSignatureHeaderValue( { paymentSignatureRequestPayloadToEncode: null } )
            } ).toThrow( 'Failed to encode PAYMENT-SIGNATURE header' )
        } )


        test( 'throws on invalid decode input', () => {
            expect( () => {
                PaymentHeaders.decodePaymentSignatureHeaderValue( { paymentSignatureHeaderValueToDecode: 123 } )
            } ).toThrow( 'Failed to decode PAYMENT-SIGNATURE header' )
        } )
    } )


    describe( 'PAYMENT-RESPONSE header', () => {
        test( 'encodes payment response payload', () => {
            const { paymentResponseHeaderValue } = PaymentHeaders
                .encodePaymentResponseHeaderValue( { paymentResponseSettlementPayloadToEncode: samplePaymentResponse } )

            expect( typeof paymentResponseHeaderValue ).toBe( 'string' )
        } )


        test( 'decodes payment response header value', () => {
            const { paymentResponseHeaderValue } = PaymentHeaders
                .encodePaymentResponseHeaderValue( { paymentResponseSettlementPayloadToEncode: samplePaymentResponse } )

            const { decodedPaymentResponseSettlementPayload } = PaymentHeaders
                .decodePaymentResponseHeaderValue( { paymentResponseHeaderValueToDecode: paymentResponseHeaderValue } )

            expect( decodedPaymentResponseSettlementPayload ).toEqual( samplePaymentResponse )
        } )


        test( 'throws on null encode input', () => {
            expect( () => {
                PaymentHeaders.encodePaymentResponseHeaderValue( { paymentResponseSettlementPayloadToEncode: null } )
            } ).toThrow( 'Failed to encode PAYMENT-RESPONSE header' )
        } )


        test( 'throws on invalid decode input', () => {
            expect( () => {
                PaymentHeaders.decodePaymentResponseHeaderValue( { paymentResponseHeaderValueToDecode: null } )
            } ).toThrow( 'Failed to decode PAYMENT-RESPONSE header' )
        } )
    } )
} )
