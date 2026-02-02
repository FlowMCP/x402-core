import { describe, test, expect, jest } from '@jest/globals'


const mockCreatePublicClient = jest.fn()
const mockCreateWalletClient = jest.fn()
const mockHttp = jest.fn()
const mockParseAbi = jest.fn().mockReturnValue( [] )
const mockEncodeFunctionData = jest.fn()
const mockFormatUnits = jest.fn()
const mockRecoverTypedDataAddress = jest.fn()
const mockPrivateKeyToAccount = jest.fn()

jest.unstable_mockModule( 'viem', () => ( {
    createPublicClient: mockCreatePublicClient,
    createWalletClient: mockCreateWalletClient,
    http: mockHttp,
    parseAbi: mockParseAbi,
    encodeFunctionData: mockEncodeFunctionData,
    formatUnits: mockFormatUnits,
    recoverTypedDataAddress: mockRecoverTypedDataAddress
} ) )

jest.unstable_mockModule( 'viem/accounts', () => ( {
    privateKeyToAccount: mockPrivateKeyToAccount
} ) )

const { ServerExact, NonceStore } = await import( '../../src/v2/exact/evm/ServerExact.mjs' )


describe( 'V2 ServerExact instance methods', () => {
    let mockProvider
    let mockWallet


    beforeEach( () => {
        jest.clearAllMocks()

        mockProvider = {
            getBalance: jest.fn().mockResolvedValue( BigInt( '1000000000000000000' ) ),
            call: jest.fn().mockResolvedValue( '0x' )
        }

        mockWallet = {
            sendTransaction: jest.fn().mockResolvedValue( '0xTxHash123' )
        }

        mockCreatePublicClient.mockReturnValue( mockProvider )
        mockCreateWalletClient.mockReturnValue( mockWallet )
        mockHttp.mockReturnValue( 'http-transport' )
        mockFormatUnits.mockReturnValue( '1.0' )
        mockPrivateKeyToAccount.mockReturnValue( {
            address: '0xFacilitator'
        } )
    } )


    describe( 'init', () => {
        test( 'initializes with single providerUrl', () => {
            const server = new ServerExact( { silent: true } )
            const result = server.init( { providerUrl: 'http://localhost:8545' } )

            expect( result ).toBe( server )
            expect( mockCreatePublicClient ).toHaveBeenCalledTimes( 1 )
        } )


        test( 'initializes with providerUrlMap', () => {
            const server = new ServerExact( { silent: true } )
            server.init( {
                providerUrlMap: {
                    'eip155:84532': 'http://base:8545',
                    'eip155:1': 'http://mainnet:8545'
                }
            } )

            expect( mockCreatePublicClient ).toHaveBeenCalledTimes( 2 )
        } )


        test( 'throws when neither providerUrl nor providerUrlMap', () => {
            const server = new ServerExact( { silent: true } )

            expect( () => {
                server.init( {} )
            } ).toThrow( 'Either providerUrl or providerUrlMap is required' )
        } )
    } )


    describe( 'setWallet', () => {
        test( 'sets wallet with single privateKey', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            await server.setWallet( { privateKey: '0xabc123' } )

            expect( mockPrivateKeyToAccount ).toHaveBeenCalledWith( '0xabc123' )
        } )


        test( 'adds 0x prefix if missing', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            await server.setWallet( { privateKey: 'abc123' } )

            expect( mockPrivateKeyToAccount ).toHaveBeenCalledWith( '0xabc123' )
        } )


        test( 'sets wallet with privateKeyMap', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( {
                providerUrlMap: { 'eip155:84532': 'http://base:8545' }
            } )

            await server.setWallet( {
                privateKeyMap: { 'eip155:84532': '0xkey1' }
            } )

            expect( mockPrivateKeyToAccount ).toHaveBeenCalledWith( '0xkey1' )
        } )


        test( 'throws when no provider for network in privateKeyMap', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            await expect( server.setWallet( {
                privateKeyMap: { 'eip155:999': '0xkey' }
            } ) ).rejects.toThrow( 'No provider configured for network' )
        } )


        test( 'throws when neither privateKey nor privateKeyMap', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            await expect( server.setWallet( {} ) )
                .rejects.toThrow( 'Either privateKey or privateKeyMap is required' )
        } )
    } )


    describe( 'decodePaymentSignatureHeader', () => {
        test( 'decodes a base64 payment header', () => {
            const payload = {
                x402Version: 2,
                resource: 'test',
                accepted: { scheme: 'exact' },
                payload: { authorization: {}, signature: '0x' }
            }

            const encoded = Buffer.from( JSON.stringify( payload ) ).toString( 'base64' )

            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const { decodedPaymentSignatureRequestPayload } = server
                .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: encoded } )

            expect( decodedPaymentSignatureRequestPayload.x402Version ).toBe( 2 )
        } )
    } )


    describe( 'validatePaymentSignatureRequestPayload', () => {
        test( 'returns validation failure for invalid shape', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const { paymentSignatureRequestPayloadValidationOutcome } = await server
                .validatePaymentSignatureRequestPayload( {
                    decodedPaymentSignatureRequestPayloadToValidate: { invalid: true },
                    paymentRequiredResponsePayload: { resource: 'test', accepts: [] }
                } )

            expect( paymentSignatureRequestPayloadValidationOutcome.validationOk ).toBe( false )
        } )


        test( 'returns failure when accepted option does not match any requirement', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const decodedPayload = {
                x402Version: 2,
                resource: 'mcp://tool/test',
                accepted: {
                    scheme: 'exact',
                    network: 'eip155:84532',
                    amount: '1000000',
                    asset: '0xABC',
                    payTo: '0xPayTo'
                },
                payload: {
                    authorization: {
                        from: '0xSender',
                        to: '0xPayTo',
                        value: '1000000',
                        validAfter: '0',
                        validBefore: '9999999999',
                        nonce: '0x' + 'a'.repeat( 64 )
                    },
                    signature: '0x' + 'b'.repeat( 130 )
                }
            }

            const paymentRequired = {
                resource: 'mcp://tool/test',
                accepts: [
                    { scheme: 'exact', network: 'eip155:1', asset: '0xDEF', payTo: '0xOther' }
                ]
            }

            const { paymentSignatureRequestPayloadValidationOutcome } = await server
                .validatePaymentSignatureRequestPayload( {
                    decodedPaymentSignatureRequestPayloadToValidate: decodedPayload,
                    paymentRequiredResponsePayload: paymentRequired
                } )

            expect( paymentSignatureRequestPayloadValidationOutcome.validationOk ).toBe( false )

            const issueMessages = paymentSignatureRequestPayloadValidationOutcome.validationIssueList
                .map( ( issue ) => issue.issueMessage )

            expect( issueMessages.some( ( m ) => m.includes( 'does not match' ) ) ).toBe( true )
        } )
    } )


    describe( 'simulateTransaction', () => {
        test( 'returns simulation success', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const { paymentSimulationOutcome } = await server
                .simulateTransaction( {
                    decodedPaymentSignatureRequestPayload: {
                        accepted: { network: 'eip155:84532', asset: '0xToken' },
                        payload: {
                            authorization: {
                                from: '0xSender',
                                to: '0xReceiver',
                                value: '1000000',
                                validAfter: '0',
                                validBefore: '9999999999',
                                nonce: '0x' + 'a'.repeat( 64 )
                            },
                            signature: '0x' + 'b'.repeat( 130 )
                        }
                    },
                    matchedPaymentRequirementsFromClientPayload: {}
                } )

            expect( paymentSimulationOutcome.simulationOk ).toBe( true )
        } )


        test( 'returns simulation failure on provider error', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            mockProvider.call.mockRejectedValue( new Error( 'revert' ) )
            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const { paymentSimulationOutcome } = await server
                .simulateTransaction( {
                    decodedPaymentSignatureRequestPayload: {
                        accepted: { network: 'eip155:84532', asset: '0xToken' },
                        payload: {
                            authorization: {
                                from: '0xSender',
                                to: '0xReceiver',
                                value: '1000000',
                                validAfter: '0',
                                validBefore: '9999999999',
                                nonce: '0x' + 'a'.repeat( 64 )
                            },
                            signature: '0x' + 'b'.repeat( 130 )
                        }
                    },
                    matchedPaymentRequirementsFromClientPayload: {}
                } )

            expect( paymentSimulationOutcome.simulationOk ).toBe( false )
            expect( paymentSimulationOutcome.simulationError ).toBe( 'revert' )
        } )
    } )


    describe( 'settleTransaction', () => {
        test( 'settles and returns success', async () => {
            const nonceStore = new NonceStore()
            const server = new ServerExact( { nonceStore, silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )
            await server.setWallet( { privateKey: '0xkey' } )

            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const { paymentSettlementOutcome } = await server
                .settleTransaction( {
                    decodedPaymentSignatureRequestPayload: {
                        accepted: { network: 'eip155:84532', asset: '0xToken' },
                        payload: {
                            authorization: {
                                from: '0xSender',
                                to: '0xReceiver',
                                value: '1000000',
                                validAfter: '0',
                                validBefore: '9999999999',
                                nonce: '0xNonce1'
                            },
                            signature: '0x' + 'b'.repeat( 130 )
                        }
                    },
                    matchedPaymentRequirementsFromClientPayload: {}
                } )

            expect( paymentSettlementOutcome.settlementOk ).toBe( true )
            expect( paymentSettlementOutcome.settlementResponse.success ).toBe( true )
            expect( nonceStore.isUsed( { nonceKey: '0xsender-0xnonce1' } ) ).toBe( true )
        } )


        test( 'returns failure on sendTransaction error', async () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )
            await server.setWallet( { privateKey: '0xkey' } )

            mockWallet.sendTransaction.mockRejectedValue( new Error( 'gas too low' ) )
            mockEncodeFunctionData.mockReturnValue( '0xdata' )

            const { paymentSettlementOutcome } = await server
                .settleTransaction( {
                    decodedPaymentSignatureRequestPayload: {
                        accepted: { network: 'eip155:84532', asset: '0xToken' },
                        payload: {
                            authorization: {
                                from: '0xSender',
                                to: '0xReceiver',
                                value: '1000000',
                                validAfter: '0',
                                validBefore: '9999999999',
                                nonce: '0xNonce2'
                            },
                            signature: '0x' + 'b'.repeat( 130 )
                        }
                    },
                    matchedPaymentRequirementsFromClientPayload: {}
                } )

            expect( paymentSettlementOutcome.settlementOk ).toBe( false )
            expect( paymentSettlementOutcome.settlementError ).toBe( 'gas too low' )
        } )
    } )


    describe( 'createPaymentResponseHeader', () => {
        test( 'creates base64 encoded header', () => {
            const server = new ServerExact( { silent: true } )
            server.init( { providerUrl: 'http://localhost:8545' } )

            const { paymentResponseHeaderValue } = server
                .createPaymentResponseHeader( {
                    paymentResponseSettlementPayload: {
                        success: true,
                        transactionHash: '0xabc',
                        network: 'eip155:84532'
                    }
                } )

            expect( typeof paymentResponseHeaderValue ).toBe( 'string' )
        } )
    } )
} )
