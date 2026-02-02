import { describe, test, expect } from '@jest/globals'
import { ServerExact } from '../../src/v1/exact/evm/ServerExact.mjs'


describe( 'V1 ServerExact static methods', () => {
    const paymentOptions = {
        'usdc-base': {
            maxAmountRequired: '1.00',
            payTo: '{{merchantWallet}}'
        }
    }

    const serverCredentials = {
        merchantWallet: '0x1234567890abcdef1234567890abcdef12345678'
    }

    const contracts = {
        'usdc-base': {
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            domainName: 'USD Coin'
        }
    }


    describe( 'getPreparedPaymentOptions', () => {
        test( 'resolves payTo alias from serverCredentials', () => {
            const { preparedPaymentOptions } = ServerExact
                .getPreparedPaymentOptions( {
                    paymentOptions,
                    activePaymentOptions: [ 'usdc-base' ],
                    serverCredentials
                } )

            expect( preparedPaymentOptions[ 'usdc-base' ].payTo ).toBe( '0x1234567890abcdef1234567890abcdef12345678' )
        } )


        test( 'throws for missing contractId', () => {
            expect( () => {
                ServerExact.getPreparedPaymentOptions( {
                    paymentOptions,
                    activePaymentOptions: [ 'nonexistent' ],
                    serverCredentials
                } )
            } ).toThrow( 'not found in paymentOptions' )
        } )


        test( 'throws for missing payTo alias in credentials', () => {
            const badOptions = { 'usdc-base': { maxAmountRequired: '1.00', payTo: '{{unknown}}' } }

            expect( () => {
                ServerExact.getPreparedPaymentOptions( {
                    paymentOptions: badOptions,
                    activePaymentOptions: [ 'usdc-base' ],
                    serverCredentials
                } )
            } ).toThrow( 'not found in serverCredentials' )
        } )
    } )


    describe( 'getPaymentRequirementsPayload', () => {
        test( 'builds payload with correct structure', () => {
            const { preparedPaymentOptions } = ServerExact
                .getPreparedPaymentOptions( { paymentOptions, activePaymentOptions: [ 'usdc-base' ], serverCredentials } )

            const { paymentRequirementsPayload } = ServerExact
                .getPaymentRequirementsPayload( {
                    chainId: '84532',
                    chainName: 'base-sepolia',
                    preparedPaymentOptions,
                    contracts,
                    resource: 'test-resource'
                } )

            expect( paymentRequirementsPayload.x402Version ).toBe( 1 )
            expect( paymentRequirementsPayload.accepts ).toHaveLength( 1 )
            expect( paymentRequirementsPayload.accepts[ 0 ].scheme ).toBe( 'exact' )
            expect( paymentRequirementsPayload.accepts[ 0 ].network ).toBe( 'base-sepolia' )
            expect( paymentRequirementsPayload.accepts[ 0 ].extra.resource ).toBe( 'test-resource' )
        } )


        test( 'includes domain info in extra', () => {
            const { preparedPaymentOptions } = ServerExact
                .getPreparedPaymentOptions( { paymentOptions, activePaymentOptions: [ 'usdc-base' ], serverCredentials } )

            const { paymentRequirementsPayload } = ServerExact
                .getPaymentRequirementsPayload( {
                    chainId: '84532',
                    chainName: 'base-sepolia',
                    preparedPaymentOptions,
                    contracts
                } )

            const domain = paymentRequirementsPayload.accepts[ 0 ].extra.domain

            expect( domain.name ).toBe( 'USD Coin' )
            expect( domain.version ).toBe( '2' )
            expect( domain.chainId ).toBe( 84532 )
            expect( domain.verifyingContract ).toBe( '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' )
        } )


        test( 'handles empty resource', () => {
            const { preparedPaymentOptions } = ServerExact
                .getPreparedPaymentOptions( { paymentOptions, activePaymentOptions: [ 'usdc-base' ], serverCredentials } )

            const { paymentRequirementsPayload } = ServerExact
                .getPaymentRequirementsPayload( {
                    chainId: '84532',
                    chainName: 'base-sepolia',
                    preparedPaymentOptions,
                    contracts
                } )

            expect( paymentRequirementsPayload.accepts[ 0 ].extra.resource ).toBe( '' )
        } )
    } )
} )
