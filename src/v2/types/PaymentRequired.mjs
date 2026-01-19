// PaymentRequired v2 Type Definition and Validator
// Spec: x402Version, error (optional), resource, accepts[]


class PaymentRequired {
    static validatePaymentRequiredObjectShape( { paymentRequiredObjectToValidate } ) {
        const validationIssueList = []

        if( paymentRequiredObjectToValidate === undefined || paymentRequiredObjectToValidate === null ) {
            validationIssueList.push( {
                issuePath: '',
                issueCode: 'invalid_payload',
                issueMessage: 'PaymentRequired object is undefined or null'
            } )

            return { validationOk: false, validationIssueList }
        }

        const { x402Version, resource, accepts, error } = paymentRequiredObjectToValidate

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

        if( accepts === undefined ) {
            validationIssueList.push( {
                issuePath: 'accepts',
                issueCode: 'invalid_payload',
                issueMessage: 'accepts is required'
            } )
        } else if( !Array.isArray( accepts ) ) {
            validationIssueList.push( {
                issuePath: 'accepts',
                issueCode: 'invalid_payload',
                issueMessage: 'accepts must be an array'
            } )
        } else if( accepts.length === 0 ) {
            validationIssueList.push( {
                issuePath: 'accepts',
                issueCode: 'invalid_payment_requirements',
                issueMessage: 'accepts must contain at least one payment option'
            } )
        } else {
            accepts
                .forEach( ( option, index ) => {
                    const optionIssues = PaymentRequired.#validateAcceptsEntry( { entry: option, index } )
                    validationIssueList.push( ...optionIssues )
                } )
        }

        if( error !== undefined && typeof error !== 'string' ) {
            validationIssueList.push( {
                issuePath: 'error',
                issueCode: 'invalid_payload',
                issueMessage: 'error must be a string if provided'
            } )
        }

        const validationOk = validationIssueList.length === 0

        return { validationOk, validationIssueList }
    }


    static #validateAcceptsEntry( { entry, index } ) {
        const issues = []
        const basePath = `accepts[${index}]`

        const requiredFields = [
            [ 'scheme', 'string' ],
            [ 'network', 'string' ],
            [ 'amount', 'string' ],
            [ 'asset', 'string' ],
            [ 'payTo', 'string' ],
            [ 'maxTimeoutSeconds', 'number' ]
        ]

        requiredFields
            .forEach( ( [ field, expectedType ] ) => {
                const value = entry[ field ]

                if( value === undefined ) {
                    issues.push( {
                        issuePath: `${basePath}.${field}`,
                        issueCode: 'invalid_payment_requirements',
                        issueMessage: `${field} is required`
                    } )
                } else if( typeof value !== expectedType ) {
                    issues.push( {
                        issuePath: `${basePath}.${field}`,
                        issueCode: 'invalid_payment_requirements',
                        issueMessage: `${field} must be a ${expectedType}`
                    } )
                }
            } )

        if( entry.scheme !== undefined && entry.scheme !== 'exact' ) {
            issues.push( {
                issuePath: `${basePath}.scheme`,
                issueCode: 'invalid_payment_requirements',
                issueMessage: `scheme must be "exact" for v2 exact/evm, got "${entry.scheme}"`
            } )
        }

        if( entry.extra !== undefined && typeof entry.extra !== 'object' ) {
            issues.push( {
                issuePath: `${basePath}.extra`,
                issueCode: 'invalid_payment_requirements',
                issueMessage: 'extra must be an object if provided'
            } )
        }

        return issues
    }


    static createPaymentRequiredObject( { resource, accepts, error = null } ) {
        const paymentRequired = {
            x402Version: 2,
            resource,
            accepts
        }

        if( error !== null ) {
            paymentRequired[ 'error' ] = error
        }

        return { paymentRequired }
    }
}


export { PaymentRequired }
