import { describe, test, expect } from '@jest/globals'
import { ConfigValidator } from '../../src/v2/config/index.mjs'


describe( 'ConfigValidator', () => {
    const validContractCatalog = {
        'usdc-base': {
            paymentNetworkId: 'eip155:8453',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            domainName: 'USD Coin',
            domainVersion: '2'
        }
    }

    const validPaymentOptionCatalog = {
        'option-1': {
            contractId: 'usdc-base',
            amount: '1000000',
            payTo: '0x1234567890abcdef1234567890abcdef12345678'
        }
    }


    test( 'validates a correct configuration', () => {
        const { configurationValidationOk, configurationValidationIssueList } =
            ConfigValidator.validateX402V2ExactEvmConfiguration( {
                contractCatalog: validContractCatalog,
                paymentOptionCatalog: validPaymentOptionCatalog
            } )

        expect( configurationValidationOk ).toBe( true )
        expect( configurationValidationIssueList ).toHaveLength( 0 )
    } )


    test( 'rejects missing contractCatalog', () => {
        const { configurationValidationOk, configurationValidationIssueList } =
            ConfigValidator.validateX402V2ExactEvmConfiguration( {
                contractCatalog: undefined,
                paymentOptionCatalog: validPaymentOptionCatalog
            } )

        expect( configurationValidationOk ).toBe( false )
        expect( configurationValidationIssueList.length ).toBeGreaterThan( 0 )

        const issue = configurationValidationIssueList[ 0 ]

        expect( issue.issuePath ).toBe( 'contractCatalog' )
    } )


    test( 'rejects missing paymentOptionCatalog', () => {
        const { configurationValidationOk, configurationValidationIssueList } =
            ConfigValidator.validateX402V2ExactEvmConfiguration( {
                contractCatalog: validContractCatalog,
                paymentOptionCatalog: undefined
            } )

        expect( configurationValidationOk ).toBe( false )
        expect( configurationValidationIssueList.length ).toBeGreaterThan( 0 )

        const issue = configurationValidationIssueList[ 0 ]

        expect( issue.issuePath ).toBe( 'paymentOptionCatalog' )
    } )


    test( 'rejects invalid paymentNetworkId format', () => {
        const invalidCatalog = {
            'usdc-bad': {
                paymentNetworkId: 'wrong:8453',
                address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                decimals: 6,
                domainName: 'USD Coin',
                domainVersion: '2'
            }
        }

        const { configurationValidationOk, configurationValidationIssueList } =
            ConfigValidator.validateX402V2ExactEvmConfiguration( {
                contractCatalog: invalidCatalog,
                paymentOptionCatalog: {
                    'option-1': {
                        contractId: 'usdc-bad',
                        amount: '1000000',
                        payTo: '0x1234567890abcdef1234567890abcdef12345678'
                    }
                }
            } )

        expect( configurationValidationOk ).toBe( false )

        const networkIssue = configurationValidationIssueList
            .find( ( issue ) => issue.issueCode === 'invalid_network' )

        expect( networkIssue ).toBeDefined()
    } )


    test( 'rejects contractId referencing missing contract', () => {
        const { configurationValidationOk, configurationValidationIssueList } =
            ConfigValidator.validateX402V2ExactEvmConfiguration( {
                contractCatalog: validContractCatalog,
                paymentOptionCatalog: {
                    'option-1': {
                        contractId: 'nonexistent',
                        amount: '1000000',
                        payTo: '0x1234567890abcdef1234567890abcdef12345678'
                    }
                }
            } )

        expect( configurationValidationOk ).toBe( false )

        const refIssue = configurationValidationIssueList
            .find( ( issue ) => issue.issueMessage.includes( 'not found in contractCatalog' ) )

        expect( refIssue ).toBeDefined()
    } )
} )
