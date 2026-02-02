import { describe, test, expect } from '@jest/globals'
import { SettlementResponse } from '../../src/v2/types/SettlementResponse.mjs'


describe( 'SettlementResponse', () => {
    describe( 'validateSettlementResponseObjectShape', () => {
        test( 'validates correct success response', () => {
            const { validationOk, validationIssueList } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: {
                        success: true,
                        transaction: '0xabc',
                        network: 'eip155:8453',
                        payer: '0x1234'
                    }
                } )

            expect( validationOk ).toBe( true )
            expect( validationIssueList ).toHaveLength( 0 )
        } )


        test( 'validates correct failure response', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: {
                        success: false,
                        errorReason: 'insufficient gas'
                    }
                } )

            expect( validationOk ).toBe( true )
        } )


        test( 'rejects undefined object', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( { settlementResponseObjectToValidate: undefined } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects null object', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( { settlementResponseObjectToValidate: null } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing success field', () => {
            const { validationOk, validationIssueList } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { transaction: '0xabc' }
                } )

            expect( validationOk ).toBe( false )

            const issue = validationIssueList
                .find( ( i ) => i.issuePath === 'success' )

            expect( issue ).toBeDefined()
        } )


        test( 'rejects non-boolean success', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { success: 'yes' }
                } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects success=true without transaction', () => {
            const { validationOk, validationIssueList } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { success: true, network: 'eip155:8453', payer: '0x1' }
                } )

            expect( validationOk ).toBe( false )

            const issue = validationIssueList
                .find( ( i ) => i.issuePath === 'transaction' )

            expect( issue ).toBeDefined()
        } )


        test( 'rejects success=true without network', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { success: true, transaction: '0xabc', payer: '0x1' }
                } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects success=true without payer', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { success: true, transaction: '0xabc', network: 'eip155:8453' }
                } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects success=false without errorReason', () => {
            const { validationOk, validationIssueList } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { success: false }
                } )

            expect( validationOk ).toBe( false )

            const issue = validationIssueList
                .find( ( i ) => i.issuePath === 'errorReason' )

            expect( issue ).toBeDefined()
        } )


        test( 'rejects non-string errorReason', () => {
            const { validationOk } = SettlementResponse
                .validateSettlementResponseObjectShape( {
                    settlementResponseObjectToValidate: { success: false, errorReason: 42 }
                } )

            expect( validationOk ).toBe( false )
        } )
    } )


    describe( 'createSuccessSettlementResponse', () => {
        test( 'creates success response', () => {
            const { settlementResponse } = SettlementResponse
                .createSuccessSettlementResponse( { transaction: '0xhash', network: 'eip155:8453', payer: '0xpayer' } )

            expect( settlementResponse.success ).toBe( true )
            expect( settlementResponse.transaction ).toBe( '0xhash' )
            expect( settlementResponse.network ).toBe( 'eip155:8453' )
            expect( settlementResponse.payer ).toBe( '0xpayer' )
        } )
    } )


    describe( 'createFailureSettlementResponse', () => {
        test( 'creates failure response', () => {
            const { settlementResponse } = SettlementResponse
                .createFailureSettlementResponse( { errorReason: 'out of gas' } )

            expect( settlementResponse.success ).toBe( false )
            expect( settlementResponse.errorReason ).toBe( 'out of gas' )
        } )
    } )
} )
