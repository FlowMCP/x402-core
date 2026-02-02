import { describe, test, expect } from '@jest/globals'
import { ConfigValidator } from '../../src/v2/config/validateX402V2ExactEvmConfiguration.mjs'
import { VALID_CONTRACT_CATALOG, VALID_PAYMENT_OPTION_CATALOG } from '../helpers/config.mjs'


describe( 'ConfigValidator extended branches', () => {
    describe( 'contractCatalog validation', () => {
        test( 'validates missing contractCatalog', () => {
            const { configurationValidationOk, configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: undefined,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG
                } )

            expect( configurationValidationOk ).toBe( false )
            expect( configurationValidationIssueList[ 0 ].issueMessage ).toContain( 'required' )
        } )


        test( 'validates non-object contractCatalog', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: 'string',
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG
                } )

            expect( configurationValidationOk ).toBe( false )
        } )


        test( 'validates array contractCatalog', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: [],
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG
                } )

            expect( configurationValidationOk ).toBe( false )
        } )


        test( 'detects missing contract fields', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: {
                        'bad-contract': {}
                    },
                    paymentOptionCatalog: {}
                } )

            const missingFields = configurationValidationIssueList
                .filter( ( i ) => i.issueMessage.includes( 'is required' ) )

            expect( missingFields.length ).toBeGreaterThanOrEqual( 5 )
        } )


        test( 'detects wrong type for contract fields', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: {
                        'wrong-types': {
                            paymentNetworkId: 123,
                            address: 456,
                            decimals: 'six',
                            domainName: true,
                            domainVersion: false
                        }
                    },
                    paymentOptionCatalog: {}
                } )

            const typeErrors = configurationValidationIssueList
                .filter( ( i ) => i.issueMessage.includes( 'must be a' ) )

            expect( typeErrors.length ).toBeGreaterThanOrEqual( 5 )
        } )


        test( 'detects invalid paymentNetworkId prefix', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: {
                        'bad-network': {
                            paymentNetworkId: 'solana:mainnet',
                            address: '0xABC',
                            decimals: 6,
                            domainName: 'USDC',
                            domainVersion: '2'
                        }
                    },
                    paymentOptionCatalog: {}
                } )

            const networkIssue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'eip155:' ) )

            expect( networkIssue ).toBeDefined()
        } )


        test( 'validates non-array supportedAssetTransferMethodList', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: {
                        'methods-contract': {
                            paymentNetworkId: 'eip155:8453',
                            address: '0xABC',
                            decimals: 6,
                            domainName: 'USDC',
                            domainVersion: '2',
                            supportedAssetTransferMethodList: 'not-array'
                        }
                    },
                    paymentOptionCatalog: {}
                } )

            const methodIssue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'supportedAssetTransferMethodList' ) )

            expect( methodIssue ).toBeDefined()
        } )
    } )


    describe( 'paymentOptionCatalog validation', () => {
        test( 'validates missing paymentOptionCatalog', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: undefined
                } )

            expect( configurationValidationOk ).toBe( false )
        } )


        test( 'validates non-object paymentOptionCatalog', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: 'bad'
                } )

            expect( configurationValidationOk ).toBe( false )
        } )


        test( 'detects missing option fields', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: {
                        'empty-option': {}
                    }
                } )

            const missingFields = configurationValidationIssueList
                .filter( ( i ) => i.issueMessage.includes( 'is required' ) )

            expect( missingFields.length ).toBeGreaterThanOrEqual( 3 )
        } )


        test( 'detects wrong type for option fields', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: {
                        'wrong-option': {
                            contractId: 123,
                            amount: 456,
                            payTo: true
                        }
                    }
                } )

            const typeErrors = configurationValidationIssueList
                .filter( ( i ) => i.issueMessage.includes( 'must be a' ) )

            expect( typeErrors.length ).toBeGreaterThanOrEqual( 3 )
        } )


        test( 'detects unresolvable payTo alias', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: {
                        'alias-option': {
                            contractId: 'usdc-base',
                            amount: '100',
                            payTo: '{{unknown-alias}}'
                        }
                    }
                } )

            const aliasIssue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'not found in serverPayToAddressMap' ) )

            expect( aliasIssue ).toBeDefined()
        } )


        test( 'detects invalid contractId reference', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: {
                        'bad-ref': {
                            contractId: 'nonexistent',
                            amount: '100',
                            payTo: '0xABC'
                        }
                    }
                } )

            const refIssue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'not found in contractCatalog' ) )

            expect( refIssue ).toBeDefined()
        } )


        test( 'detects unsupported assetTransferMethod', () => {
            const contractCatalog = {
                'usdc-base': {
                    ...VALID_CONTRACT_CATALOG[ 'usdc-base' ],
                    supportedAssetTransferMethodList: [ 'transferWithAuthorization' ]
                }
            }

            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog,
                    paymentOptionCatalog: {
                        'bad-method': {
                            contractId: 'usdc-base',
                            amount: '100',
                            payTo: '0xABC',
                            assetTransferMethod: 'unsupportedMethod'
                        }
                    }
                } )

            const methodIssue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'not in contract' ) )

            expect( methodIssue ).toBeDefined()
        } )


        test( 'detects mismatched expectedPaymentNetworkId', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: {
                        'mismatch-option': {
                            contractId: 'usdc-base',
                            amount: '100',
                            payTo: '0xABC',
                            expectedPaymentNetworkId: 'eip155:999'
                        }
                    }
                } )

            const networkIssue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'does not match derived network' ) )

            expect( networkIssue ).toBeDefined()
        } )
    } )


    describe( 'serverPayToAddressMap validation', () => {
        test( 'detects non-object serverPayToAddressMap', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: 'bad'
                } )

            expect( configurationValidationOk ).toBe( false )
        } )


        test( 'detects array serverPayToAddressMap', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: []
                } )

            expect( configurationValidationOk ).toBe( false )
        } )
    } )


    describe( 'restrictedCalls validation', () => {
        test( 'validates non-array restrictedCalls', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    restrictedCalls: 'bad'
                } )

            expect( configurationValidationOk ).toBe( false )
        } )


        test( 'validates missing acceptedPaymentOptionIdList', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    restrictedCalls: [ { method: 'tools/call', name: 'test' } ]
                } )

            const issue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'acceptedPaymentOptionIdList is required' ) )

            expect( issue ).toBeDefined()
        } )


        test( 'validates non-array acceptedPaymentOptionIdList', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    restrictedCalls: [ { method: 'tools/call', name: 'test', acceptedPaymentOptionIdList: 'bad' } ]
                } )

            const issue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'must be an array' ) )

            expect( issue ).toBeDefined()
        } )


        test( 'validates invalid optionId in acceptedPaymentOptionIdList', () => {
            const { configurationValidationIssueList } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    restrictedCalls: [ { method: 'tools/call', name: 'test', acceptedPaymentOptionIdList: [ 'nonexistent' ] } ]
                } )

            const issue = configurationValidationIssueList
                .find( ( i ) => i.issueMessage.includes( 'not found in paymentOptionCatalog' ) )

            expect( issue ).toBeDefined()
        } )
    } )


    describe( 'valid configuration', () => {
        test( 'passes for fully valid configuration', () => {
            const { configurationValidationOk } = ConfigValidator
                .validateX402V2ExactEvmConfiguration( {
                    contractCatalog: VALID_CONTRACT_CATALOG,
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG
                } )

            expect( configurationValidationOk ).toBe( true )
        } )
    } )
} )
