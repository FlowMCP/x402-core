import { describe, test, expect } from '@jest/globals'
import { Base64JsonCodec } from '../../src/v2/transports/http/base64JsonCodec.mjs'


describe( 'Base64JsonCodec', () => {
    describe( 'encodeBase64Json', () => {
        test( 'encodes object to base64 string', () => {
            const { base64String, encodeError } = Base64JsonCodec
                .encodeBase64Json( { plainObjectToEncode: { hello: 'world' } } )

            expect( encodeError ).toBeNull()
            expect( typeof base64String ).toBe( 'string' )
            expect( base64String.length ).toBeGreaterThan( 0 )
        } )


        test( 'returns error for undefined input', () => {
            const { base64String, encodeError } = Base64JsonCodec
                .encodeBase64Json( { plainObjectToEncode: undefined } )

            expect( base64String ).toBeNull()
            expect( encodeError.errorCode ).toBe( 'invalid_payload' )
        } )


        test( 'returns error for null input', () => {
            const { base64String, encodeError } = Base64JsonCodec
                .encodeBase64Json( { plainObjectToEncode: null } )

            expect( base64String ).toBeNull()
            expect( encodeError.errorCode ).toBe( 'invalid_payload' )
        } )


        test( 'encodes complex nested object', () => {
            const complex = { a: [ 1, 2 ], b: { c: true } }
            const { base64String, encodeError } = Base64JsonCodec
                .encodeBase64Json( { plainObjectToEncode: complex } )

            expect( encodeError ).toBeNull()
            expect( base64String ).toBeDefined()
        } )
    } )


    describe( 'decodeBase64Json', () => {
        test( 'decodes base64 string to object', () => {
            const original = { hello: 'world', number: 42 }
            const { base64String } = Base64JsonCodec
                .encodeBase64Json( { plainObjectToEncode: original } )

            const { decodedPlainObject, decodeError } = Base64JsonCodec
                .decodeBase64Json( { base64StringToDecode: base64String } )

            expect( decodeError ).toBeNull()
            expect( decodedPlainObject ).toEqual( original )
        } )


        test( 'returns error for undefined input', () => {
            const { decodedPlainObject, decodeError } = Base64JsonCodec
                .decodeBase64Json( { base64StringToDecode: undefined } )

            expect( decodedPlainObject ).toBeNull()
            expect( decodeError.errorCode ).toBe( 'invalid_payload' )
        } )


        test( 'returns error for non-string input', () => {
            const { decodedPlainObject, decodeError } = Base64JsonCodec
                .decodeBase64Json( { base64StringToDecode: 12345 } )

            expect( decodedPlainObject ).toBeNull()
            expect( decodeError.errorMessage ).toBe( 'Input must be a string' )
        } )


        test( 'returns error for invalid base64 json', () => {
            const { decodedPlainObject, decodeError } = Base64JsonCodec
                .decodeBase64Json( { base64StringToDecode: 'not-valid-base64-json!!!' } )

            expect( decodedPlainObject ).toBeNull()
            expect( decodeError.errorMessage ).toContain( 'Base64/JSON decode failed' )
        } )
    } )
} )
