import { describe, test, expect } from '@jest/globals'
import { ClientExact } from '../../src/v2/exact/evm/ClientExact.mjs'
import { SAMPLE_ACCEPTS_ENTRY } from '../helpers/config.mjs'


describe( 'V2 ClientExact static methods', () => {
    describe( 'validatePaymentRequiredResponsePayload', () => {
        test( 'validates correct payload', () => {
            const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
                .validatePaymentRequiredResponsePayload( {
                    paymentRequiredResponsePayloadToValidate: {
                        x402Version: 2,
                        resource: 'mcp://tool/test',
                        accepts: [ SAMPLE_ACCEPTS_ENTRY ]
                    }
                } )

            expect( paymentRequiredResponsePayloadValidationOutcome.validationOk ).toBe( true )
        } )


        test( 'rejects invalid payload', () => {
            const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
                .validatePaymentRequiredResponsePayload( {
                    paymentRequiredResponsePayloadToValidate: null
                } )

            expect( paymentRequiredResponsePayloadValidationOutcome.validationOk ).toBe( false )
        } )
    } )


    describe( 'selectMatchingPaymentOption', () => {
        const paymentRequired = {
            x402Version: 2,
            resource: 'test',
            accepts: [
                {
                    scheme: 'exact',
                    network: 'eip155:8453',
                    amount: '1000000',
                    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                    payTo: '0x1234',
                    maxTimeoutSeconds: 300
                },
                {
                    scheme: 'exact',
                    network: 'eip155:43114',
                    amount: '2000000',
                    asset: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
                    payTo: '0x5678',
                    maxTimeoutSeconds: 300
                }
            ]
        }


        test( 'selects option matching network constraint', () => {
            const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: [ 'eip155:8453' ]
                } )

            expect( selectedPaymentRequirements.network ).toBe( 'eip155:8453' )
            expect( paymentOptionSelectionDiagnostics.filteredByNetwork ).toBe( 1 )
        } )


        test( 'selects option matching asset constraint', () => {
            const { selectedPaymentRequirements } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [
                        { asset: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', maxAmount: '5000000' }
                    ],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( selectedPaymentRequirements.network ).toBe( 'eip155:43114' )
        } )


        test( 'returns null when no match after filtering', () => {
            const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: [ 'eip155:999' ]
                } )

            expect( selectedPaymentRequirements ).toBeNull()
            expect( paymentOptionSelectionDiagnostics.errorCode ).toBe( 'no_matching_payment_option' )
        } )


        test( 'filters by scheme (only exact)', () => {
            const mixed = {
                accepts: [
                    { scheme: 'flexible', network: 'eip155:8453', amount: '100', asset: '0x1', payTo: '0x2' },
                    { scheme: 'exact', network: 'eip155:8453', amount: '100', asset: '0x1', payTo: '0x2', maxTimeoutSeconds: 300 }
                ]
            }

            const { paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: mixed,
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( paymentOptionSelectionDiagnostics.filteredByScheme ).toBe( 1 )
        } )


        test( 'returns diagnostics for missing accepts', () => {
            const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: {},
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( selectedPaymentRequirements ).toBeNull()
            expect( paymentOptionSelectionDiagnostics.error ).toContain( 'accepts is missing' )
        } )


        test( 'respects maxAmount constraint', () => {
            const { selectedPaymentRequirements } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [
                        { asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', maxAmount: '500000' }
                    ],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( selectedPaymentRequirements ).toBeNull()
        } )


        test( 'passes through all options when no constraints', () => {
            const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( selectedPaymentRequirements ).not.toBeNull()
            expect( paymentOptionSelectionDiagnostics.candidatesAfterFilter ).toBe( 2 )
        } )


        test( 'returns diagnostics with totalServerOptions', () => {
            const { paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( paymentOptionSelectionDiagnostics.totalServerOptions ).toBe( 2 )
        } )


        test( 'returns selectionReason in diagnostics', () => {
            const { paymentOptionSelectionDiagnostics } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequiredResponsePayload: paymentRequired,
                    clientAllowedAssetConstraintList: [],
                    clientSupportedPaymentNetworkIdList: []
                } )

            expect( paymentOptionSelectionDiagnostics.selectionReason ).toBeDefined()
        } )
    } )


    describe( 'createPaymentPayloadObject', () => {
        test( 'creates correct payment payload', () => {
            const { paymentPayload } = ClientExact
                .createPaymentPayloadObject( {
                    resource: 'mcp://tool/test',
                    selectedPaymentRequirements: SAMPLE_ACCEPTS_ENTRY,
                    exactEvmAuthorizationPayload: {
                        from: '0xaaa',
                        to: '0xbbb',
                        value: BigInt( 1000000 ),
                        validAfter: BigInt( 0 ),
                        validBefore: BigInt( 999999 ),
                        nonce: '0xnonce'
                    },
                    exactEvmAuthorizationSignature: '0xsig'
                } )

            expect( paymentPayload.x402Version ).toBe( 2 )
            expect( paymentPayload.resource ).toBe( 'mcp://tool/test' )
            expect( paymentPayload.accepted.scheme ).toBe( 'exact' )
            expect( paymentPayload.payload.signature ).toBe( '0xsig' )
        } )


        test( 'converts BigInt values to strings in authorization', () => {
            const { paymentPayload } = ClientExact
                .createPaymentPayloadObject( {
                    resource: 'test',
                    selectedPaymentRequirements: SAMPLE_ACCEPTS_ENTRY,
                    exactEvmAuthorizationPayload: {
                        from: '0xaaa',
                        to: '0xbbb',
                        value: BigInt( 5000000 ),
                        validAfter: BigInt( 100 ),
                        validBefore: BigInt( 999 ),
                        nonce: '0xnonce'
                    },
                    exactEvmAuthorizationSignature: '0xsig'
                } )

            expect( typeof paymentPayload.payload.authorization.value ).toBe( 'string' )
            expect( paymentPayload.payload.authorization.value ).toBe( '5000000' )
        } )
    } )
} )
