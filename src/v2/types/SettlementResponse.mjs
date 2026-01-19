// SettlementResponse v2 Type Definition and Validator
// Spec: success, transaction, network, payer, optional errorReason


class SettlementResponse {
    static validateSettlementResponseObjectShape( { settlementResponseObjectToValidate } ) {
        const validationIssueList = []

        if( settlementResponseObjectToValidate === undefined || settlementResponseObjectToValidate === null ) {
            validationIssueList.push( {
                issuePath: '',
                issueCode: 'invalid_payload',
                issueMessage: 'SettlementResponse object is undefined or null'
            } )

            return { validationOk: false, validationIssueList }
        }

        const { success, transaction, network, payer, errorReason } = settlementResponseObjectToValidate

        if( success === undefined ) {
            validationIssueList.push( {
                issuePath: 'success',
                issueCode: 'invalid_payload',
                issueMessage: 'success is required'
            } )
        } else if( typeof success !== 'boolean' ) {
            validationIssueList.push( {
                issuePath: 'success',
                issueCode: 'invalid_payload',
                issueMessage: 'success must be a boolean'
            } )
        }

        if( success === true ) {
            if( transaction === undefined ) {
                validationIssueList.push( {
                    issuePath: 'transaction',
                    issueCode: 'invalid_payload',
                    issueMessage: 'transaction is required for successful settlement'
                } )
            } else if( typeof transaction !== 'string' ) {
                validationIssueList.push( {
                    issuePath: 'transaction',
                    issueCode: 'invalid_payload',
                    issueMessage: 'transaction must be a string'
                } )
            }

            if( network === undefined ) {
                validationIssueList.push( {
                    issuePath: 'network',
                    issueCode: 'invalid_payload',
                    issueMessage: 'network is required for successful settlement'
                } )
            } else if( typeof network !== 'string' ) {
                validationIssueList.push( {
                    issuePath: 'network',
                    issueCode: 'invalid_payload',
                    issueMessage: 'network must be a string'
                } )
            }

            if( payer === undefined ) {
                validationIssueList.push( {
                    issuePath: 'payer',
                    issueCode: 'invalid_payload',
                    issueMessage: 'payer is required for successful settlement'
                } )
            } else if( typeof payer !== 'string' ) {
                validationIssueList.push( {
                    issuePath: 'payer',
                    issueCode: 'invalid_payload',
                    issueMessage: 'payer must be a string'
                } )
            }
        }

        if( success === false ) {
            if( errorReason === undefined ) {
                validationIssueList.push( {
                    issuePath: 'errorReason',
                    issueCode: 'invalid_payload',
                    issueMessage: 'errorReason is required for failed settlement'
                } )
            } else if( typeof errorReason !== 'string' ) {
                validationIssueList.push( {
                    issuePath: 'errorReason',
                    issueCode: 'invalid_payload',
                    issueMessage: 'errorReason must be a string'
                } )
            }
        }

        const validationOk = validationIssueList.length === 0

        return { validationOk, validationIssueList }
    }


    static createSuccessSettlementResponse( { transaction, network, payer } ) {
        const settlementResponse = {
            success: true,
            transaction,
            network,
            payer
        }

        return { settlementResponse }
    }


    static createFailureSettlementResponse( { errorReason } ) {
        const settlementResponse = {
            success: false,
            errorReason
        }

        return { settlementResponse }
    }
}


export { SettlementResponse }
