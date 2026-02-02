import { describe, test, expect } from '@jest/globals'
import { PaymentPayload } from '../../src/v2/types/PaymentPayload.mjs'


describe( 'PaymentPayload', () => {
    const validPayload = {
        x402Version: 2,
        resource: 'mcp://tool/test',
        accepted: {
            scheme: 'exact',
            network: 'eip155:8453',
            amount: '1000000',
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            payTo: '0x1234567890abcdef1234567890abcdef12345678'
        },
        payload: {
            signature: '0xdeadbeef',
            authorization: {
                from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                to: '0x1234567890abcdef1234567890abcdef12345678',
                value: '1000000',
                validAfter: '0',
                validBefore: '9999999999',
                nonce: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            }
        }
    }


    describe( 'validatePaymentPayloadObjectShape', () => {
        test( 'validates correct payload', () => {
            const { validationOk, validationIssueList } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: validPayload } )

            expect( validationOk ).toBe( true )
            expect( validationIssueList ).toHaveLength( 0 )
        } )


        test( 'rejects undefined payload', () => {
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: undefined } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects null payload', () => {
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: null } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing x402Version', () => {
            const { x402Version, ...rest } = validPayload
            const { validationOk, validationIssueList } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: rest } )

            expect( validationOk ).toBe( false )

            const issue = validationIssueList
                .find( ( i ) => i.issuePath === 'x402Version' )

            expect( issue ).toBeDefined()
        } )


        test( 'rejects wrong x402Version', () => {
            const bad = { ...validPayload, x402Version: 1 }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing resource', () => {
            const { resource, ...rest } = validPayload
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: rest } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects non-string resource', () => {
            const bad = { ...validPayload, resource: 42 }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing accepted', () => {
            const { accepted, ...rest } = validPayload
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: rest } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects array accepted', () => {
            const bad = { ...validPayload, accepted: [] }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'validates accepted entry fields', () => {
            const bad = { ...validPayload, accepted: { scheme: 'exact' } }
            const { validationOk, validationIssueList } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )

            const networkIssue = validationIssueList
                .find( ( i ) => i.issuePath === 'accepted.network' )

            expect( networkIssue ).toBeDefined()
        } )


        test( 'rejects missing payload', () => {
            const { payload, ...rest } = validPayload
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: rest } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects array payload', () => {
            const bad = { ...validPayload, payload: [] }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing signature in payload', () => {
            const bad = { ...validPayload, payload: { authorization: validPayload.payload.authorization } }
            const { validationOk, validationIssueList } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )

            const sigIssue = validationIssueList
                .find( ( i ) => i.issueCode === 'invalid_exact_evm_payload_signature' )

            expect( sigIssue ).toBeDefined()
        } )


        test( 'rejects non-string signature', () => {
            const bad = { ...validPayload, payload: { ...validPayload.payload, signature: 123 } }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects missing authorization', () => {
            const bad = { ...validPayload, payload: { signature: '0xabc' } }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'rejects array authorization', () => {
            const bad = { ...validPayload, payload: { signature: '0xabc', authorization: [] } }
            const { validationOk } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )
        } )


        test( 'validates authorization fields', () => {
            const bad = {
                ...validPayload,
                payload: { signature: '0xabc', authorization: { from: '0xaaa' } }
            }
            const { validationOk, validationIssueList } = PaymentPayload
                .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: bad } )

            expect( validationOk ).toBe( false )

            const toIssue = validationIssueList
                .find( ( i ) => i.issuePath === 'payload.authorization.to' )

            expect( toIssue ).toBeDefined()
        } )
    } )


    describe( 'createPaymentPayloadObject', () => {
        test( 'creates correct payment payload', () => {
            const authorization = {
                from: '0xaaaa',
                to: '0xbbbb',
                value: BigInt( 1000000 ),
                validAfter: BigInt( 0 ),
                validBefore: BigInt( 9999999999 ),
                nonce: '0xnonce'
            }

            const { paymentPayload } = PaymentPayload
                .createPaymentPayloadObject( {
                    resource: 'mcp://tool/test',
                    accepted: { scheme: 'exact', network: 'eip155:8453' },
                    signature: '0xsig',
                    authorization
                } )

            expect( paymentPayload.x402Version ).toBe( 2 )
            expect( paymentPayload.resource ).toBe( 'mcp://tool/test' )
            expect( paymentPayload.payload.signature ).toBe( '0xsig' )
            expect( paymentPayload.payload.authorization.value ).toBe( '1000000' )
            expect( paymentPayload.payload.authorization.validAfter ).toBe( '0' )
            expect( paymentPayload.payload.authorization.validBefore ).toBe( '9999999999' )
        } )
    } )
} )
