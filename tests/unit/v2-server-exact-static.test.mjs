import { describe, test, expect } from '@jest/globals'
import { ServerExact } from '../../src/v2/exact/evm/ServerExact.mjs'
import { VALID_CONTRACT_CATALOG, VALID_PAYMENT_OPTION_CATALOG, VALID_SERVER_PAY_TO_ADDRESS_MAP } from '../helpers/config.mjs'


describe( 'V2 ServerExact static methods', () => {
    describe( 'getPreparedPaymentOptionCatalog', () => {
        test( 'prepares catalog with derived network and resolved payTo', () => {
            const { preparedPaymentOptionCatalog } = ServerExact
                .getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            const option = preparedPaymentOptionCatalog[ 'option-base-usdc' ]

            expect( option.derivedPaymentNetworkId ).toBe( 'eip155:8453' )
            expect( option.amount ).toBe( '1000000' )
            expect( option.maxTimeoutSeconds ).toBe( 300 )
        } )


        test( 'resolves payTo alias from serverPayToAddressMap', () => {
            const catalog = {
                'option-alias': {
                    contractId: 'usdc-base',
                    amount: '500000',
                    payTo: '{{merchant-wallet}}'
                }
            }

            const { preparedPaymentOptionCatalog } = ServerExact
                .getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: catalog,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            expect( preparedPaymentOptionCatalog[ 'option-alias' ].payTo ).toBe( '0x1234567890abcdef1234567890abcdef12345678' )
        } )


        test( 'throws for unresolvable payTo alias', () => {
            const catalog = {
                'option-bad': {
                    contractId: 'usdc-base',
                    amount: '500000',
                    payTo: '{{unknown-alias}}'
                }
            }

            expect( () => {
                ServerExact.getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: catalog,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )
            } ).toThrow( 'not found in serverPayToAddressMap' )
        } )


        test( 'throws for missing contractId reference', () => {
            const catalog = {
                'option-bad': {
                    contractId: 'nonexistent',
                    amount: '500000',
                    payTo: '0xabc'
                }
            }

            expect( () => {
                ServerExact.getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: catalog,
                    serverPayToAddressMap: {},
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )
            } ).toThrow( 'not found in contractCatalog' )
        } )


        test( 'uses custom defaultMaxTimeoutSeconds', () => {
            const { preparedPaymentOptionCatalog } = ServerExact
                .getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    serverDefaultMaxTimeoutSeconds: 600,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            expect( preparedPaymentOptionCatalog[ 'option-base-usdc' ].maxTimeoutSeconds ).toBe( 600 )
        } )
    } )


    describe( 'getPaymentRequiredResponsePayload', () => {
        test( 'builds payment required response with accepts', () => {
            const { preparedPaymentOptionCatalog } = ServerExact
                .getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            const { paymentRequiredResponsePayload } = ServerExact
                .getPaymentRequiredResponsePayload( {
                    monetizedResourceDescriptor: 'mcp://tool/test',
                    acceptedPaymentOptionIdList: [ 'option-base-usdc' ],
                    preparedPaymentOptionCatalog,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            expect( paymentRequiredResponsePayload.x402Version ).toBe( 2 )
            expect( paymentRequiredResponsePayload.resource ).toBe( 'mcp://tool/test' )
            expect( paymentRequiredResponsePayload.accepts ).toHaveLength( 1 )

            const accept = paymentRequiredResponsePayload.accepts[ 0 ]

            expect( accept.scheme ).toBe( 'exact' )
            expect( accept.network ).toBe( 'eip155:8453' )
            expect( accept.extra.name ).toBe( 'USD Coin' )
        } )


        test( 'throws for missing payment option id', () => {
            expect( () => {
                ServerExact.getPaymentRequiredResponsePayload( {
                    monetizedResourceDescriptor: 'test',
                    acceptedPaymentOptionIdList: [ 'nonexistent' ],
                    preparedPaymentOptionCatalog: {},
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )
            } ).toThrow( 'not found in preparedPaymentOptionCatalog' )
        } )


        test( 'builds multi-option accepts', () => {
            const { preparedPaymentOptionCatalog } = ServerExact
                .getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            const { paymentRequiredResponsePayload } = ServerExact
                .getPaymentRequiredResponsePayload( {
                    monetizedResourceDescriptor: 'test',
                    acceptedPaymentOptionIdList: [ 'option-base-usdc', 'option-avax-usdc' ],
                    preparedPaymentOptionCatalog,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            expect( paymentRequiredResponsePayload.accepts ).toHaveLength( 2 )
        } )


        test( 'includes assetTransferMethod in extra', () => {
            const { preparedPaymentOptionCatalog } = ServerExact
                .getPreparedPaymentOptionCatalog( {
                    paymentOptionCatalog: VALID_PAYMENT_OPTION_CATALOG,
                    serverPayToAddressMap: VALID_SERVER_PAY_TO_ADDRESS_MAP,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            const { paymentRequiredResponsePayload } = ServerExact
                .getPaymentRequiredResponsePayload( {
                    monetizedResourceDescriptor: 'test',
                    acceptedPaymentOptionIdList: [ 'option-base-usdc' ],
                    preparedPaymentOptionCatalog,
                    contractCatalog: VALID_CONTRACT_CATALOG
                } )

            expect( paymentRequiredResponsePayload.accepts[ 0 ].extra.assetTransferMethod ).toBe( 'transferWithAuthorization' )
        } )
    } )
} )
