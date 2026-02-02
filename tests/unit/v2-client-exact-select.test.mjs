import { describe, test, expect } from '@jest/globals'
import { ClientExact } from '../../src/v2/exact/evm/ClientExact.mjs'


describe( 'V2 ClientExact selectMatchingPaymentOption (extended)', () => {
    const BASE_PAYLOAD = {
        x402Version: 2,
        resource: 'mcp://tool/test',
        accepts: [
            {
                scheme: 'exact',
                network: 'eip155:84532',
                amount: '1000000',
                asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                payTo: '0xPayTo',
                maxTimeoutSeconds: 300,
                extra: { name: 'USDC', version: '2' }
            }
        ]
    }


    test( 'returns null when accepts is missing', () => {
        const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: {},
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeNull()
        expect( paymentOptionSelectionDiagnostics.error ).toContain( 'accepts is missing' )
    } )


    test( 'returns null when accepts is not an array', () => {
        const { selectedPaymentRequirements } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: { accepts: 'not-array' },
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeNull()
    } )


    test( 'filters out non-exact schemes', () => {
        const payload = {
            accepts: [
                { scheme: 'flexible', network: 'eip155:84532', amount: '100', asset: '0xABC', payTo: '0x1' }
            ]
        }

        const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: payload,
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeNull()
        expect( paymentOptionSelectionDiagnostics.filteredByScheme ).toBe( 1 )
    } )


    test( 'filters by supported network list', () => {
        const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: [ 'eip155:1' ]
            } )

        expect( selectedPaymentRequirements ).toBeNull()
        expect( paymentOptionSelectionDiagnostics.filteredByNetwork ).toBe( 1 )
    } )


    test( 'passes through when network list is empty', () => {
        const { selectedPaymentRequirements } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeDefined()
        expect( selectedPaymentRequirements.scheme ).toBe( 'exact' )
    } )


    test( 'filters by asset constraint list', () => {
        const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [
                    { asset: '0xDifferentAsset' }
                ],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeNull()
        expect( paymentOptionSelectionDiagnostics.filteredByAsset ).toBe( 1 )
    } )


    test( 'matches asset constraint case-insensitively', () => {
        const { selectedPaymentRequirements } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [
                    { asset: '0x036cbd53842c5426634e7929541ec2318f3dcf7e' }
                ],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeDefined()
    } )


    test( 'filters by maxAmount constraint', () => {
        const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [
                    { asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmount: '500000' }
                ],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeNull()
        expect( paymentOptionSelectionDiagnostics.filteredByAsset ).toBe( 1 )
    } )


    test( 'allows when maxAmount is sufficient', () => {
        const { selectedPaymentRequirements } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [
                    { asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmount: '2000000' }
                ],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeDefined()
    } )


    test( 'selects from multiple candidates', () => {
        const multiPayload = {
            accepts: [
                {
                    scheme: 'exact',
                    network: 'eip155:84532',
                    amount: '2000000',
                    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    payTo: '0xPayTo',
                    maxTimeoutSeconds: 300,
                    extra: { name: 'USDC', version: '2' }
                },
                {
                    scheme: 'exact',
                    network: 'eip155:84532',
                    amount: '500000',
                    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    payTo: '0xPayTo',
                    maxTimeoutSeconds: 300,
                    extra: { name: 'USDC', version: '2' }
                }
            ]
        }

        const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: multiPayload,
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( selectedPaymentRequirements ).toBeDefined()
        expect( paymentOptionSelectionDiagnostics.candidatesAfterFilter ).toBe( 2 )
    } )


    test( 'provides full diagnostics on success', () => {
        const { paymentOptionSelectionDiagnostics } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: [],
                clientSupportedPaymentNetworkIdList: []
            } )

        expect( paymentOptionSelectionDiagnostics.totalServerOptions ).toBe( 1 )
        expect( paymentOptionSelectionDiagnostics.filteredByScheme ).toBe( 0 )
        expect( paymentOptionSelectionDiagnostics.filteredByNetwork ).toBe( 0 )
        expect( paymentOptionSelectionDiagnostics.filteredByAsset ).toBe( 0 )
        expect( paymentOptionSelectionDiagnostics.candidatesAfterFilter ).toBe( 1 )
        expect( paymentOptionSelectionDiagnostics.selectionReason ).toBeDefined()
    } )


    test( 'passes through when asset list is null', () => {
        const { selectedPaymentRequirements } = ClientExact
            .selectMatchingPaymentOption( {
                paymentRequiredResponsePayload: BASE_PAYLOAD,
                clientAllowedAssetConstraintList: null,
                clientSupportedPaymentNetworkIdList: null
            } )

        expect( selectedPaymentRequirements ).toBeDefined()
    } )
} )
