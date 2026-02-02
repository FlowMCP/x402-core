import { describe, test, expect } from '@jest/globals'
import { ClientExact } from '../../src/v1/exact/evm/ClientExact.mjs'


describe( 'V1 ClientExact static methods', () => {
    describe( 'selectMatchingPaymentOption', () => {
        const paymentRequirementsPayload = {
            x402Version: 1,
            accepts: [
                {
                    scheme: 'exact',
                    network: 'base-sepolia',
                    payTo: '0x1234',
                    maxAmountRequired: '1.00',
                    extra: {
                        domain: {
                            name: 'USD Coin',
                            version: '2',
                            chainId: 84532,
                            verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                        }
                    }
                }
            ]
        }


        test( 'selects matching payment option', () => {
            const { paymentOption } = ClientExact
                .selectMatchingPaymentOption( {
                    paymentRequirementsPayload,
                    allowedPaymentOptions: [
                        { tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmountRequired: '0.50' }
                    ],
                    chainId: 84532
                } )

            expect( paymentOption ).toBeDefined()
            expect( paymentOption.scheme ).toBe( 'exact' )
        } )


        test( 'throws when no matching option found', () => {
            expect( () => {
                ClientExact.selectMatchingPaymentOption( {
                    paymentRequirementsPayload,
                    allowedPaymentOptions: [
                        { tokenAddress: '0xDEADBEEF', maxAmountRequired: '0.50' }
                    ],
                    chainId: 84532
                } )
            } ).toThrow( 'No matching payment option found' )
        } )


        test( 'rejects mismatched chainId', () => {
            expect( () => {
                ClientExact.selectMatchingPaymentOption( {
                    paymentRequirementsPayload,
                    allowedPaymentOptions: [
                        { tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmountRequired: '0.50' }
                    ],
                    chainId: 1
                } )
            } ).toThrow( 'No matching payment option found' )
        } )


        test( 'filters by scheme exact only', () => {
            const mixed = {
                accepts: [
                    {
                        scheme: 'flexible',
                        network: 'base-sepolia',
                        extra: { domain: { chainId: 84532, verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' } },
                        maxAmountRequired: '1.00'
                    }
                ]
            }

            expect( () => {
                ClientExact.selectMatchingPaymentOption( {
                    paymentRequirementsPayload: mixed,
                    allowedPaymentOptions: [
                        { tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', maxAmountRequired: '0.50' }
                    ],
                    chainId: 84532
                } )
            } ).toThrow( 'No matching payment option found' )
        } )
    } )
} )
