// PaymentPayload v2 Type Definition and Validator
// Spec: x402Version, resource, accepted (one element from accepts), payload (exact/evm: signature + authorization)


class PaymentPayload {
    static validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate } ) {
        const validationIssueList = []

        if( paymentPayloadObjectToValidate === undefined || paymentPayloadObjectToValidate === null ) {
            validationIssueList.push( {
                issuePath: '',
                issueCode: 'invalid_payload',
                issueMessage: 'PaymentPayload object is undefined or null'
            } )

            return { validationOk: false, validationIssueList }
        }

        const { x402Version, resource, accepted, payload } = paymentPayloadObjectToValidate

        if( x402Version === undefined ) {
            validationIssueList.push( {
                issuePath: 'x402Version',
                issueCode: 'invalid_payload',
                issueMessage: 'x402Version is required'
            } )
        } else if( x402Version !== 2 ) {
            validationIssueList.push( {
                issuePath: 'x402Version',
                issueCode: 'invalid_payload',
                issueMessage: `x402Version must be 2, got ${x402Version}`
            } )
        }

        if( resource === undefined ) {
            validationIssueList.push( {
                issuePath: 'resource',
                issueCode: 'invalid_payload',
                issueMessage: 'resource is required'
            } )
        } else if( typeof resource !== 'string' ) {
            validationIssueList.push( {
                issuePath: 'resource',
                issueCode: 'invalid_payload',
                issueMessage: 'resource must be a string'
            } )
        }

        if( accepted === undefined ) {
            validationIssueList.push( {
                issuePath: 'accepted',
                issueCode: 'invalid_payload',
                issueMessage: 'accepted is required'
            } )
        } else if( typeof accepted !== 'object' || Array.isArray( accepted ) ) {
            validationIssueList.push( {
                issuePath: 'accepted',
                issueCode: 'invalid_payload',
                issueMessage: 'accepted must be an object'
            } )
        } else {
            const acceptedIssues = PaymentPayload.#validateAcceptedEntry( { entry: accepted } )
            validationIssueList.push( ...acceptedIssues )
        }

        if( payload === undefined ) {
            validationIssueList.push( {
                issuePath: 'payload',
                issueCode: 'invalid_payload',
                issueMessage: 'payload is required'
            } )
        } else if( typeof payload !== 'object' || Array.isArray( payload ) ) {
            validationIssueList.push( {
                issuePath: 'payload',
                issueCode: 'invalid_payload',
                issueMessage: 'payload must be an object'
            } )
        } else {
            const payloadIssues = PaymentPayload.#validateExactEvmPayload( { payload } )
            validationIssueList.push( ...payloadIssues )
        }

        const validationOk = validationIssueList.length === 0

        return { validationOk, validationIssueList }
    }


    static #validateAcceptedEntry( { entry } ) {
        const issues = []
        const basePath = 'accepted'

        const requiredFields = [
            [ 'scheme', 'string' ],
            [ 'network', 'string' ],
            [ 'amount', 'string' ],
            [ 'asset', 'string' ],
            [ 'payTo', 'string' ]
        ]

        requiredFields
            .forEach( ( [ field, expectedType ] ) => {
                const value = entry[ field ]

                if( value === undefined ) {
                    issues.push( {
                        issuePath: `${basePath}.${field}`,
                        issueCode: 'invalid_payload',
                        issueMessage: `${field} is required in accepted`
                    } )
                } else if( typeof value !== expectedType ) {
                    issues.push( {
                        issuePath: `${basePath}.${field}`,
                        issueCode: 'invalid_payload',
                        issueMessage: `${field} must be a ${expectedType}`
                    } )
                }
            } )

        return issues
    }


    static #validateExactEvmPayload( { payload } ) {
        const issues = []
        const basePath = 'payload'

        const { signature, authorization } = payload

        if( signature === undefined ) {
            issues.push( {
                issuePath: `${basePath}.signature`,
                issueCode: 'invalid_exact_evm_payload_signature',
                issueMessage: 'signature is required in payload'
            } )
        } else if( typeof signature !== 'string' ) {
            issues.push( {
                issuePath: `${basePath}.signature`,
                issueCode: 'invalid_exact_evm_payload_signature',
                issueMessage: 'signature must be a string'
            } )
        }

        if( authorization === undefined ) {
            issues.push( {
                issuePath: `${basePath}.authorization`,
                issueCode: 'invalid_payload',
                issueMessage: 'authorization is required in payload'
            } )
        } else if( typeof authorization !== 'object' || Array.isArray( authorization ) ) {
            issues.push( {
                issuePath: `${basePath}.authorization`,
                issueCode: 'invalid_payload',
                issueMessage: 'authorization must be an object'
            } )
        } else {
            const authIssues = PaymentPayload.#validateAuthorization( { authorization } )
            issues.push( ...authIssues )
        }

        return issues
    }


    static #validateAuthorization( { authorization } ) {
        const issues = []
        const basePath = 'payload.authorization'

        const requiredFields = [
            [ 'from', 'string' ],
            [ 'to', 'string' ],
            [ 'value', 'string' ],
            [ 'validAfter', 'string' ],
            [ 'validBefore', 'string' ],
            [ 'nonce', 'string' ]
        ]

        requiredFields
            .forEach( ( [ field, expectedType ] ) => {
                const value = authorization[ field ]

                if( value === undefined ) {
                    issues.push( {
                        issuePath: `${basePath}.${field}`,
                        issueCode: 'invalid_payload',
                        issueMessage: `${field} is required in authorization`
                    } )
                } else if( typeof value !== expectedType ) {
                    issues.push( {
                        issuePath: `${basePath}.${field}`,
                        issueCode: 'invalid_payload',
                        issueMessage: `${field} must be a ${expectedType}`
                    } )
                }
            } )

        return issues
    }


    static createPaymentPayloadObject( { resource, accepted, signature, authorization } ) {
        const safeAuthorization = {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce
        }

        const paymentPayload = {
            x402Version: 2,
            resource,
            accepted,
            payload: {
                signature,
                authorization: safeAuthorization
            }
        }

        return { paymentPayload }
    }
}


export { PaymentPayload }
