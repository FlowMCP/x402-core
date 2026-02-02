import { describe, test, expect, jest, beforeEach } from '@jest/globals'


const mockCreatePublicClient = jest.fn()
const mockCreateWalletClient = jest.fn()
const mockHttp = jest.fn()
const mockParseAbi = jest.fn().mockReturnValue( [] )
const mockFormatUnits = jest.fn()
const mockPrivateKeyToAccount = jest.fn()

const mockParseUnits = jest.fn()
const mockGetContract = jest.fn()
const mockEncodeFunctionData = jest.fn()

jest.unstable_mockModule( 'viem', () => ( {
    createPublicClient: mockCreatePublicClient,
    createWalletClient: mockCreateWalletClient,
    http: mockHttp,
    parseAbi: mockParseAbi,
    parseUnits: mockParseUnits,
    encodeFunctionData: mockEncodeFunctionData,
    getContract: mockGetContract,
    formatUnits: mockFormatUnits
} ) )

jest.unstable_mockModule( 'viem/accounts', () => ( {
    privateKeyToAccount: mockPrivateKeyToAccount
} ) )

const { ServerExact } = await import( '../../src/v1/exact/evm/ServerExact.mjs' )
const { NonceStore } = await import( '../../src/v1/exact/evm/NonceStore.mjs' )
const { ClientExact } = await import( '../../src/v1/exact/evm/ClientExact.mjs' )


describe( 'V1 ServerExact instance methods', () => {
    let mockProvider


    beforeEach( () => {
        jest.clearAllMocks()

        mockProvider = {
            getBalance: jest.fn().mockResolvedValue( BigInt( '1000000000000000000' ) ),
            call: jest.fn().mockResolvedValue( '0x' ),
            readContract: jest.fn().mockResolvedValue( 'USD Coin' )
        }

        mockCreatePublicClient.mockReturnValue( mockProvider )
        mockCreateWalletClient.mockReturnValue( {
            sendTransaction: jest.fn().mockResolvedValue( '0xTxHash' )
        } )
        mockHttp.mockReturnValue( 'http-transport' )
        mockFormatUnits.mockReturnValue( '1.0' )
        mockPrivateKeyToAccount.mockReturnValue( { address: '0xFacilitator' } )
    } )


    describe( 'init', () => {
        test( 'initializes with providerUrl', () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            const result = server.init( { providerUrl: 'http://localhost:8545' } )

            expect( result ).toBe( server )
            expect( mockCreatePublicClient ).toHaveBeenCalled()
        } )
    } )


    describe( 'setWallet', () => {
        test( 'sets wallet and reads balance', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const result = await server.setWallet( { privateKey: '0xkey' } )

            expect( mockPrivateKeyToAccount ).toHaveBeenCalledWith( '0xkey' )
            expect( mockProvider.getBalance ).toHaveBeenCalledWith( { address: '0xFacilitator' } )
            expect( result ).toBe( server )
        } )


        test( 'adds 0x prefix if missing', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            await server.setWallet( { privateKey: 'abc123' } )

            expect( mockPrivateKeyToAccount ).toHaveBeenCalledWith( '0xabc123' )
        } )
    } )


    describe( 'getPreparedPaymentOptions', () => {
        test( 'returns prepared payment options with resolved payTo', () => {
            const paymentOptions = {
                'usdc': {
                    domain: {
                        name: 'USD Coin',
                        version: '2',
                        chainId: 84532,
                        verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                    },
                    decimals: 6,
                    payTo: '{{serverAddress}}'
                }
            }

            const { preparedPaymentOptions } = ServerExact
                .getPreparedPaymentOptions( {
                    paymentOptions,
                    activePaymentOptions: [ 'usdc' ],
                    serverCredentials: { serverAddress: '0xServer' }
                } )

            expect( preparedPaymentOptions ).toBeDefined()
            expect( preparedPaymentOptions[ 'usdc' ] ).toBeDefined()
            expect( preparedPaymentOptions[ 'usdc' ].payTo ).toBe( '0xServer' )
        } )


        test( 'throws when contractId not found', () => {
            expect( () => {
                ServerExact.getPreparedPaymentOptions( {
                    paymentOptions: {},
                    activePaymentOptions: [ 'nonexistent' ],
                    serverCredentials: {}
                } )
            } ).toThrow( 'not found in paymentOptions' )
        } )


        test( 'throws when payTo key not in serverCredentials', () => {
            expect( () => {
                ServerExact.getPreparedPaymentOptions( {
                    paymentOptions: { 'usdc': { payTo: '{{missingKey}}' } },
                    activePaymentOptions: [ 'usdc' ],
                    serverCredentials: {}
                } )
            } ).toThrow( 'not found in serverCredentials' )
        } )
    } )


    describe( 'getPaymentRequirementsPayload', () => {
        test( 'builds payment requirements payload', () => {
            const preparedPaymentOptions = {
                '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
                    domain: {
                        name: 'USD Coin',
                        version: '2',
                        chainId: 84532,
                        verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                    },
                    payTo: '0xServer',
                    maxAmountRequired: '1.00',
                    decimals: 6
                }
            }

            const contracts = {
                '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
                    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    domainName: 'USD Coin',
                    symbol: 'USDC',
                    decimals: 6
                }
            }

            const { paymentRequirementsPayload } = ServerExact
                .getPaymentRequirementsPayload( {
                    chainId: 84532,
                    chainName: 'base-sepolia',
                    preparedPaymentOptions,
                    contracts,
                    resource: ''
                } )

            expect( paymentRequirementsPayload ).toBeDefined()
            expect( paymentRequirementsPayload.x402Version ).toBe( 1 )
            expect( paymentRequirementsPayload.accepts ).toBeDefined()
            expect( paymentRequirementsPayload.accepts ).toHaveLength( 1 )
            expect( paymentRequirementsPayload.accepts[ 0 ].scheme ).toBe( 'exact' )
            expect( paymentRequirementsPayload.accepts[ 0 ].network ).toBe( 'base-sepolia' )
            expect( paymentRequirementsPayload.accepts[ 0 ].payTo ).toBe( '0xServer' )
        } )
    } )


    describe( 'decodePaymentHeader', () => {
        test( 'decodes JSON payment header and converts BigInt fields', () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const header = JSON.stringify( {
                scheme: 'exact',
                network: 'base-sepolia',
                payload: {
                    authorization: {
                        from: '0xSender',
                        to: '0xReceiver',
                        value: '1000000',
                        validAfter: '0',
                        validBefore: '9999999999',
                        nonce: '0xabc'
                    },
                    signature: '0xsig'
                }
            } )

            const { decodedPayment } = server.decodePaymentHeader( { headerString: header } )

            expect( decodedPayment.scheme ).toBe( 'exact' )
            expect( typeof decodedPayment.payload.authorization.value ).toBe( 'bigint' )
            expect( typeof decodedPayment.payload.authorization.validAfter ).toBe( 'bigint' )
            expect( typeof decodedPayment.payload.authorization.validBefore ).toBe( 'bigint' )
        } )
    } )


    describe( 'findMatchingPaymentRequirements', () => {
        test( 'finds matching requirement', () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const paymentRequirementsPayload = {
                accepts: [ {
                    scheme: 'exact',
                    network: 'base-sepolia',
                    payTo: '0xReceiver'
                } ]
            }

            const decodedPayment = {
                scheme: 'exact',
                network: 'base-sepolia',
                payload: { authorization: { to: '0xReceiver' } }
            }

            const { selectedRequirement } = server
                .findMatchingPaymentRequirements( { paymentRequirementsPayload, decodedPayment } )

            expect( selectedRequirement ).toBeDefined()
            expect( selectedRequirement.payTo ).toBe( '0xReceiver' )
        } )


        test( 'returns null when no match', () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const paymentRequirementsPayload = {
                accepts: [ {
                    scheme: 'exact',
                    network: 'mainnet',
                    payTo: '0xOther'
                } ]
            }

            const decodedPayment = {
                scheme: 'exact',
                network: 'base-sepolia',
                payload: { authorization: { to: '0xReceiver' } }
            }

            const { selectedRequirement } = server
                .findMatchingPaymentRequirements( { paymentRequirementsPayload, decodedPayment } )

            expect( selectedRequirement ).toBeNull()
        } )
    } )


    describe( 'validatePayment', () => {
        test( 'validates successfully for valid payment', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const now = BigInt( Math.floor( Date.now() / 1000 ) )
            const decodedPayment = {
                payload: {
                    authorization: {
                        from: '0xSender',
                        nonce: '0xNonce1',
                        validAfter: now - BigInt( 60 ),
                        validBefore: now + BigInt( 300 )
                    }
                }
            }

            const { ok } = await server.validatePayment( { decodedPayment, paymentRequirement: {} } )

            expect( ok ).toBe( true )
            expect( nonceStore.isUsed( { nonceKey: '0xsender-0xnonce1' } ) ).toBe( true )
        } )


        test( 'rejects expired authorization', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const decodedPayment = {
                payload: {
                    authorization: {
                        from: '0xSender',
                        nonce: '0xNonce2',
                        validAfter: BigInt( 0 ),
                        validBefore: BigInt( 1 )
                    }
                }
            }

            const { ok, error } = await server.validatePayment( { decodedPayment, paymentRequirement: {} } )

            expect( ok ).toBe( false )
            expect( error ).toContain( 'expired' )
        } )


        test( 'rejects replayed nonce', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            nonceStore.markUsed( { nonceKey: '0xsender-0xnonce3' } )

            const now = BigInt( Math.floor( Date.now() / 1000 ) )
            const decodedPayment = {
                payload: {
                    authorization: {
                        from: '0xSender',
                        nonce: '0xNonce3',
                        validAfter: now - BigInt( 60 ),
                        validBefore: now + BigInt( 300 )
                    }
                }
            }

            const { ok, error } = await server.validatePayment( { decodedPayment, paymentRequirement: {} } )

            expect( ok ).toBe( false )
            expect( error ).toContain( 'replay' )
        } )
    } )


    describe( 'simulateTransaction', () => {
        test( 'returns success on successful simulation', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const decodedPayment = {
                payload: {
                    authorization: {
                        from: '0xSender',
                        to: '0xReceiver',
                        value: BigInt( 1000000 ),
                        validAfter: BigInt( 0 ),
                        validBefore: BigInt( 9999999999 ),
                        nonce: '0x' + 'a'.repeat( 64 )
                    },
                    signature: '0x' + 'b'.repeat( 130 )
                }
            }

            const { ok } = await server.simulateTransaction( {
                decodedPayment,
                tokenAddress: '0xToken'
            } )

            expect( ok ).toBe( true )
        } )


        test( 'returns failure on simulation error', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            mockProvider.call.mockRejectedValue( new Error( 'revert' ) )
            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const decodedPayment = {
                payload: {
                    authorization: {
                        from: '0xSender',
                        to: '0xReceiver',
                        value: BigInt( 1000000 ),
                        validAfter: BigInt( 0 ),
                        validBefore: BigInt( 9999999999 ),
                        nonce: '0x' + 'a'.repeat( 64 )
                    },
                    signature: '0x' + 'b'.repeat( 130 )
                }
            }

            const { ok, error } = await server.simulateTransaction( {
                decodedPayment,
                tokenAddress: '0xToken'
            } )

            expect( ok ).toBe( false )
            expect( error ).toBe( 'revert' )
        } )
    } )


    describe( 'settleTransaction', () => {
        test( 'settles and returns txHash', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )
            await server.setWallet( { privateKey: '0xkey' } )

            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const decodedPayment = {
                payload: {
                    authorization: {
                        from: '0xSender',
                        to: '0xReceiver',
                        value: BigInt( 1000000 ),
                        validAfter: BigInt( 0 ),
                        validBefore: BigInt( 9999999999 ),
                        nonce: '0x' + 'a'.repeat( 64 )
                    },
                    signature: '0x' + 'b'.repeat( 130 )
                }
            }

            const { ok, txHash } = await server.settleTransaction( {
                decodedPayment,
                tokenAddress: '0xToken'
            } )

            expect( ok ).toBe( true )
            expect( txHash ).toBe( '0xTxHash' )
        } )
    } )
} )


describe( 'V1 ClientExact instance methods', () => {
    let mockContractInstance


    beforeEach( () => {
        jest.clearAllMocks()

        mockContractInstance = {
            read: {
                balanceOf: jest.fn().mockResolvedValue( BigInt( '5000000' ) ),
                decimals: jest.fn().mockResolvedValue( 6 )
            }
        }

        mockCreatePublicClient.mockReturnValue( {
            readContract: jest.fn()
        } )
        mockHttp.mockReturnValue( 'http-transport' )
        mockParseAbi.mockReturnValue( [] )
        mockGetContract.mockReturnValue( mockContractInstance )
        mockFormatUnits.mockReturnValue( '5.0' )
        mockPrivateKeyToAccount.mockReturnValue( {
            address: '0xClient',
            signTypedData: jest.fn().mockResolvedValue( '0xSignature' )
        } )
    } )


    test( 'initializes with providerUrl', () => {
        const client = new ClientExact( { silent: true } )
        const result = client.init( { providerUrl: 'http://localhost:8545' } )

        expect( result ).toBe( client )
    } )


    test( 'sets wallet with allowedPaymentOptions', async () => {
        const client = new ClientExact( { silent: true } )
        client.init( { providerUrl: 'http://localhost:8545' } )

        const allowedPaymentOptions = [
            {
                name: 'USDC',
                tokenAddress: '0xToken',
                maxAmountRequired: '1.00',
                decimals: 6
            }
        ]

        const result = await client.setWallet( {
            privateKey: '0xkey',
            allowedPaymentOptions
        } )

        expect( mockPrivateKeyToAccount ).toHaveBeenCalledWith( '0xkey' )
        expect( mockGetContract ).toHaveBeenCalled()
        expect( result ).toBe( client )
    } )


    describe( 'selectMatchingPaymentOption', () => {
        test( 'selects matching payment option', () => {
            const paymentRequirementsPayload = {
                accepts: [ {
                    scheme: 'exact',
                    maxAmountRequired: '1.00',
                    extra: {
                        domain: {
                            verifyingContract: '0xToken',
                            chainId: 84532
                        }
                    }
                } ]
            }

            const { paymentOption } = ClientExact.selectMatchingPaymentOption( {
                paymentRequirementsPayload,
                allowedPaymentOptions: [
                    { tokenAddress: '0xToken', maxAmountRequired: '0.50' }
                ],
                chainId: 84532
            } )

            expect( paymentOption ).toBeDefined()
            expect( paymentOption.scheme ).toBe( 'exact' )
        } )


        test( 'throws when no match found', () => {
            const paymentRequirementsPayload = {
                accepts: [ {
                    scheme: 'exact',
                    maxAmountRequired: '1.00',
                    extra: {
                        domain: {
                            verifyingContract: '0xToken',
                            chainId: 84532
                        }
                    }
                } ]
            }

            expect( () => {
                ClientExact.selectMatchingPaymentOption( {
                    paymentRequirementsPayload,
                    allowedPaymentOptions: [
                        { tokenAddress: '0xOther', maxAmountRequired: '0.50' }
                    ],
                    chainId: 84532
                } )
            } ).toThrow( 'No matching payment option found' )
        } )


        test( 'rejects mismatched chainId', () => {
            const paymentRequirementsPayload = {
                accepts: [ {
                    scheme: 'exact',
                    maxAmountRequired: '1.00',
                    extra: {
                        domain: {
                            verifyingContract: '0xToken',
                            chainId: 1
                        }
                    }
                } ]
            }

            expect( () => {
                ClientExact.selectMatchingPaymentOption( {
                    paymentRequirementsPayload,
                    allowedPaymentOptions: [
                        { tokenAddress: '0xToken', maxAmountRequired: '0.50' }
                    ],
                    chainId: 84532
                } )
            } ).toThrow( 'No matching payment option found' )
        } )
    } )


    describe( 'createXPaymentHeader', () => {
        test( 'creates JSON header string with stringified BigInt values', () => {
            const client = new ClientExact( { silent: true } )
            client.init( { providerUrl: 'http://localhost:8545' } )

            const { headerString } = client.createXPaymentHeader( {
                scheme: 'exact',
                network: 'base-sepolia',
                authorization: {
                    from: '0xSender',
                    to: '0xReceiver',
                    value: BigInt( 1000000 ),
                    validAfter: BigInt( 0 ),
                    validBefore: BigInt( 9999999999 ),
                    nonce: '0xabc'
                },
                signature: '0xsig'
            } )

            const parsed = JSON.parse( headerString )

            expect( parsed.x402Version ).toBe( 1 )
            expect( parsed.scheme ).toBe( 'exact' )
            expect( parsed.payload.authorization.value ).toBe( '1000000' )
            expect( typeof parsed.payload.authorization.value ).toBe( 'string' )
        } )
    } )
} )
