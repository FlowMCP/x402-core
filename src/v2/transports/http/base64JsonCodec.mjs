// Base64 JSON Codec for v2 HTTP Headers
// Encodes/decodes JSON objects to/from Base64 strings

import { ErrorCodes } from '../../errors/errorCodes.mjs'


class Base64JsonCodec {
    static encodeBase64Json( { plainObjectToEncode } ) {
        if( plainObjectToEncode === undefined || plainObjectToEncode === null ) {
            return {
                base64String: null,
                encodeError: {
                    errorCode: ErrorCodes.INVALID_PAYLOAD,
                    errorMessage: 'Cannot encode undefined or null object'
                }
            }
        }

        try {
            const jsonString = JSON.stringify( plainObjectToEncode )
            const base64String = Buffer.from( jsonString, 'utf-8' ).toString( 'base64' )

            return { base64String, encodeError: null }
        } catch( e ) {
            return {
                base64String: null,
                encodeError: {
                    errorCode: ErrorCodes.INVALID_PAYLOAD,
                    errorMessage: `JSON stringify failed: ${e.message}`
                }
            }
        }
    }


    static decodeBase64Json( { base64StringToDecode } ) {
        if( base64StringToDecode === undefined || base64StringToDecode === null ) {
            return {
                decodedPlainObject: null,
                decodeError: {
                    errorCode: ErrorCodes.INVALID_PAYLOAD,
                    errorMessage: 'Cannot decode undefined or null string'
                }
            }
        }

        if( typeof base64StringToDecode !== 'string' ) {
            return {
                decodedPlainObject: null,
                decodeError: {
                    errorCode: ErrorCodes.INVALID_PAYLOAD,
                    errorMessage: 'Input must be a string'
                }
            }
        }

        try {
            const jsonString = Buffer.from( base64StringToDecode, 'base64' ).toString( 'utf-8' )
            const decodedPlainObject = JSON.parse( jsonString )

            return { decodedPlainObject, decodeError: null }
        } catch( e ) {
            return {
                decodedPlainObject: null,
                decodeError: {
                    errorCode: ErrorCodes.INVALID_PAYLOAD,
                    errorMessage: `Base64/JSON decode failed: ${e.message}`
                }
            }
        }
    }
}


export { Base64JsonCodec }
