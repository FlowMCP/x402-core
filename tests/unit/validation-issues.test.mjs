import { describe, test, expect } from '@jest/globals'
import { ValidationIssues } from '../../src/v2/errors/validationIssues.mjs'


describe( 'ValidationIssues', () => {
    describe( 'createValidationIssue', () => {
        test( 'creates issue without meta', () => {
            const { issue } = ValidationIssues
                .createValidationIssue( {
                    issuePath: 'payload.amount',
                    issueCode: 'invalid_payload',
                    issueMessage: 'Amount must be a string'
                } )

            expect( issue.issuePath ).toBe( 'payload.amount' )
            expect( issue.issueCode ).toBe( 'invalid_payload' )
            expect( issue.issueMessage ).toBe( 'Amount must be a string' )
            expect( issue.issueMeta ).toBeUndefined()
        } )


        test( 'creates issue with meta', () => {
            const { issue } = ValidationIssues
                .createValidationIssue( {
                    issuePath: 'payload.network',
                    issueCode: 'invalid_network',
                    issueMessage: 'Unsupported network',
                    issueMeta: { receivedNetwork: 'bitcoin:mainnet' }
                } )

            expect( issue.issueMeta ).toEqual( { receivedNetwork: 'bitcoin:mainnet' } )
        } )


        test( 'omits issueMeta when null', () => {
            const { issue } = ValidationIssues
                .createValidationIssue( {
                    issuePath: 'test',
                    issueCode: 'test_code',
                    issueMessage: 'test message',
                    issueMeta: null
                } )

            expect( Object.keys( issue ) ).toEqual( [ 'issuePath', 'issueCode', 'issueMessage' ] )
        } )
    } )


    describe( 'createValidationOutcome', () => {
        test( 'creates ok outcome with empty issue list', () => {
            const outcome = ValidationIssues
                .createValidationOutcome( { validationOk: true } )

            expect( outcome.validationOk ).toBe( true )
            expect( outcome.validationIssueList ).toEqual( [] )
        } )


        test( 'creates failed outcome with issues', () => {
            const issues = [ { issuePath: 'a', issueCode: 'b', issueMessage: 'c' } ]
            const outcome = ValidationIssues
                .createValidationOutcome( { validationOk: false, validationIssueList: issues } )

            expect( outcome.validationOk ).toBe( false )
            expect( outcome.validationIssueList ).toHaveLength( 1 )
        } )
    } )


    describe( 'mergeValidationOutcomes', () => {
        test( 'merges all-ok outcomes', () => {
            const outcomeA = ValidationIssues.createValidationOutcome( { validationOk: true } )
            const outcomeB = ValidationIssues.createValidationOutcome( { validationOk: true } )

            const merged = ValidationIssues
                .mergeValidationOutcomes( { outcomeList: [ outcomeA, outcomeB ] } )

            expect( merged.validationOk ).toBe( true )
            expect( merged.validationIssueList ).toHaveLength( 0 )
        } )


        test( 'merges mixed outcomes to failed', () => {
            const issueA = { issuePath: 'a', issueCode: 'a', issueMessage: 'a' }
            const outcomeA = ValidationIssues.createValidationOutcome( { validationOk: false, validationIssueList: [ issueA ] } )
            const outcomeB = ValidationIssues.createValidationOutcome( { validationOk: true } )

            const merged = ValidationIssues
                .mergeValidationOutcomes( { outcomeList: [ outcomeA, outcomeB ] } )

            expect( merged.validationOk ).toBe( false )
            expect( merged.validationIssueList ).toHaveLength( 1 )
        } )
    } )
} )
