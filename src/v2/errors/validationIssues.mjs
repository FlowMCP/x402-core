// Validation Issue Helper for X402 v2


class ValidationIssues {
    static createValidationIssue( { issuePath, issueCode, issueMessage, issueMeta = null } ) {
        const issue = {
            issuePath,
            issueCode,
            issueMessage
        }

        if( issueMeta !== null ) {
            issue[ 'issueMeta' ] = issueMeta
        }

        return { issue }
    }


    static createValidationOutcome( { validationOk, validationIssueList = [] } ) {
        return {
            validationOk,
            validationIssueList
        }
    }


    static mergeValidationOutcomes( { outcomeList } ) {
        const mergedIssueList = []
        let allOk = true

        outcomeList
            .forEach( ( outcome ) => {
                if( !outcome.validationOk ) {
                    allOk = false
                }
                mergedIssueList.push( ...outcome.validationIssueList )
            } )

        return {
            validationOk: allOk,
            validationIssueList: mergedIssueList
        }
    }
}


export { ValidationIssues }
