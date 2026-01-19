// Base64 JSON Codec for v2 HTTP Headers
// Encodes/decodes JSON objects to/from Base64 strings


class Base64JsonCodec {
    static encodeBase64Json( { plainObjectToEncode } ) {
        const jsonString = JSON.stringify( plainObjectToEncode )
        const base64String = Buffer.from( jsonString, 'utf-8' ).toString( 'base64' )

        return { base64String }
    }


    static decodeBase64Json( { base64StringToDecode } ) {
        const jsonString = Buffer.from( base64StringToDecode, 'base64' ).toString( 'utf-8' )
        const decodedPlainObject = JSON.parse( jsonString )

        return { decodedPlainObject }
    }
}


export { Base64JsonCodec }
