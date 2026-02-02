import { describe, test, expect } from '@jest/globals'
import { PaymentRequired } from '../../src/v2/types/PaymentRequired.mjs'
import { SAMPLE_ACCEPTS_ENTRY } from '../helpers/config.mjs'


describe( 'PaymentRequired', () => {
    describe( 'validatePaymentRequiredObjectShape', () => {
        test( 'validates correct object', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: {
                        x402Version: 2,
                        resource: 'mcp://tool/test',
                        accepts: [ SAMPLE_ACCEPTS_ENTRY ]
                    }
                } )

            expect( validationOk ).toBe( true )
            expect( validationIssueList ).toHaveLength( 0 )
        } )


        test( 'rejects undefined object', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( { paymentRequiredObjectToValidate: undefined } )

            expect( validationOk ).toBe( false )
            expect( validationIssueList[ 0 ].issueMessage ).toContain( 'undefined or null' )
        } )


        test( 'rejects null object', () => {
            const { validationOk } = PaymentRequired
                .validatePaymentRequiredObjectShape( { paymentRequiredObjectToValidate: null } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing x402Version', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { resource: 'test', accepts: [ SAMPLE_ACCEPTS_ENTRY ] }
                } )

            expect( validationOk ).toBe( false )
            expect( validationIssueList[ 0 ].issuePath ).toBe( 'x402Version' )
        } )


        test( 'rejects wrong x402Version', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { x402Version: 1, resource: 'test', accepts: [ SAMPLE_ACCEPTS_ENTRY ] }
                } )

            expect( validationOk ).toBe( false )
            expect( validationIssueList[ 0 ].issueMessage ).toContain( 'must be 2' )
        } )


        test( 'rejects missing resource', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { x402Version: 2, accepts: [ SAMPLE_ACCEPTS_ENTRY ] }
                } )

            expect( validationOk ).toBe( false )

            const resourceIssue = validationIssueList
                .find( ( issue ) => issue.issuePath === 'resource' )

            expect( resourceIssue ).toBeDefined()
        } )


        test( 'rejects non-string resource', () => {
            const { validationOk } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { x402Version: 2, resource: 123, accepts: [ SAMPLE_ACCEPTS_ENTRY ] }
                } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects empty accepts array', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { x402Version: 2, resource: 'test', accepts: [] }
                } )

            expect( validationOk ).toBe( false )
            expect( validationIssueList[ 0 ].issueCode ).toBe( 'invalid_payment_requirements' )
        } )


        test( 'rejects non-array accepts', () => {
            const { validationOk } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { x402Version: 2, resource: 'test', accepts: 'not-array' }
                } )

            expect( validationOk ).toBe( false )
        } )


        test( 'validates accepts entry fields', () => {
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: {
                        x402Version: 2,
                        resource: 'test',
                        accepts: [ { scheme: 'exact' } ]
                    }
                } )

            expect( validationOk ).toBe( false )
            expect( validationIssueList.length ).toBeGreaterThan( 0 )
        } )


        test( 'rejects non-string error field', () => {
            const { validationOk } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: {
                        x402Version: 2,
                        resource: 'test',
                        accepts: [ SAMPLE_ACCEPTS_ENTRY ],
                        error: 123
                    }
                } )

            expect( validationOk ).toBe( false )
        } )


        test( 'accepts string error field', () => {
            const { validationOk } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: {
                        x402Version: 2,
                        resource: 'test',
                        accepts: [ SAMPLE_ACCEPTS_ENTRY ],
                        error: 'some error'
                    }
                } )

            expect( validationOk ).toBe( true )
        } )


        test( 'validates non-exact scheme in accepts entry', () => {
            const badEntry = { ...SAMPLE_ACCEPTS_ENTRY, scheme: 'flexible' }
            const { validationOk, validationIssueList } = PaymentRequired
                .validatePaymentRequiredObjectShape( {
                    paymentRequiredObjectToValidate: { x402Version: 2, resource: 'test', accepts: [ badEntry ] }
                } )

            expect( validationOk ).toBe( false )

            const schemeIssue = validationIssueList
                .find( ( issue ) => issue.issueMessage.includes( 'scheme must be "exact"' ) )

            expect( schemeIssue ).toBeDefined()
        } )
    } )


    describe( 'createPaymentRequiredObject', () => {
        test( 'creates object with x402Version 2', () => {
            const { paymentRequired } = PaymentRequired
                .createPaymentRequiredObject( { resource: 'mcp://tool/test', accepts: [ SAMPLE_ACCEPTS_ENTRY ] } )

            expect( paymentRequired.x402Version ).toBe( 2 )
            expect( paymentRequired.resource ).toBe( 'mcp://tool/test' )
            expect( paymentRequired.accepts ).toHaveLength( 1 )
            expect( paymentRequired.error ).toBeUndefined()
        } )


        test( 'includes error when provided', () => {
            const { paymentRequired } = PaymentRequired
                .createPaymentRequiredObject( { resource: 'test', accepts: [], error: 'insufficient funds' } )

            expect( paymentRequired.error ).toBe( 'insufficient funds' )
        } )


        test( 'omits error when null', () => {
            const { paymentRequired } = PaymentRequired
                .createPaymentRequiredObject( { resource: 'test', accepts: [] } )

            expect( Object.keys( paymentRequired ) ).not.toContain( 'error' )
        } )
    } )
} )
