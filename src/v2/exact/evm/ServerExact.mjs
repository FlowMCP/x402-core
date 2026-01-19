// ServerExact v2 for exact/evm scheme
// Implements server-side payment flow with EIP-3009 settlement
// Supports Multi-Network via providerUrlMap and privateKeyMap

import { createPublicClient, createWalletClient, http, parseAbi, encodeFunctionData, formatUnits, recoverTypedDataAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { PaymentRequired } from '../../types/PaymentRequired.mjs'
import { PaymentPayload } from '../../types/PaymentPayload.mjs'
import { SettlementResponse } from '../../types/SettlementResponse.mjs'
import { PaymentHeaders } from '../../transports/http/paymentHeaders.mjs'
import { EvmNetworkParsing } from './evmNetworkParsing.mjs'
import { ErrorCodes } from '../../errors/errorCodes.mjs'


class NonceStore {
    constructor() {
        this.store = new Set()
    }


    isUsed( { nonceKey } ) {
        return this.store.has( nonceKey )
    }


    markUsed( { nonceKey } ) {
        this.store.add( nonceKey )
    }
}


class ServerExact {
    #nonceStore
    #providerMap
    #walletClientMap
    #signerMap
    #abi
    #silent


    constructor( { nonceStore = null, silent = false } = {} ) {
        this.#nonceStore = nonceStore || new NonceStore()
        this.#silent = silent
        this.#providerMap = new Map()
        this.#walletClientMap = new Map()
        this.#signerMap = new Map()
    }


    init( { providerUrl = null, providerUrlMap = null } ) {
        // Support both single providerUrl (backward compat) and providerUrlMap (multi-network)
        if( providerUrlMap !== null ) {
            Object.entries( providerUrlMap )
                .forEach( ( [ networkId, url ] ) => {
                    const provider = createPublicClient( { transport: http( url ) } )
                    this.#providerMap.set( networkId, { provider, url } )
                } )

            this.#log( `✅ ServerExact v2 initialized with ${this.#providerMap.size} network(s)` )
        } else if( providerUrl !== null ) {
            // Backward compatibility: single provider stored as 'default'
            const provider = createPublicClient( { transport: http( providerUrl ) } )
            this.#providerMap.set( 'default', { provider, url: providerUrl } )

            this.#log( '✅ ServerExact v2 initialized (single-network mode)' )
        } else {
            throw new Error( 'Either providerUrl or providerUrlMap is required' )
        }

        this.#abi = parseAbi( [
            'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
            'function balanceOf(address owner) view returns (uint256)',
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)'
        ] )

        return this
    }


    async setWallet( { privateKey = null, privateKeyMap = null, minEth = '0.01' } ) {
        // Support both single privateKey (backward compat) and privateKeyMap (multi-network)
        if( privateKeyMap !== null ) {
            const networkIds = Object.keys( privateKeyMap )

            for( const networkId of networkIds ) {
                const key = privateKeyMap[ networkId ]
                const cleanHex = key.startsWith( '0x' ) ? key : `0x${key}`
                const signer = privateKeyToAccount( cleanHex )

                const providerEntry = this.#providerMap.get( networkId )
                if( !providerEntry ) {
                    throw new Error( `No provider configured for network "${networkId}"` )
                }

                const walletClient = createWalletClient( {
                    account: signer,
                    transport: http( providerEntry.url )
                } )

                this.#signerMap.set( networkId, signer )
                this.#walletClientMap.set( networkId, walletClient )

                const balanceRaw = await providerEntry.provider.getBalance( { address: signer.address } )
                const balance = Number( formatUnits( balanceRaw, 18 ) )

                this.#log( `✅ Wallet set for ${networkId}: ${signer.address} (${balance} ETH)` )

                if( balance < parseFloat( minEth ) ) {
                    console.warn( `⚠ Facilitator ETH balance below minimum on ${networkId}` )
                }
            }
        } else if( privateKey !== null ) {
            // Backward compatibility: single wallet stored as 'default'
            const cleanHex = privateKey.startsWith( '0x' ) ? privateKey : `0x${privateKey}`
            const signer = privateKeyToAccount( cleanHex )

            const providerEntry = this.#providerMap.get( 'default' )
            if( !providerEntry ) {
                throw new Error( 'No provider configured. Call init() first.' )
            }

            const walletClient = createWalletClient( {
                account: signer,
                transport: http( providerEntry.url )
            } )

            this.#signerMap.set( 'default', signer )
            this.#walletClientMap.set( 'default', walletClient )

            const balanceRaw = await providerEntry.provider.getBalance( { address: signer.address } )
            const balance = Number( formatUnits( balanceRaw, 18 ) )

            this.#log( `✅ Facilitator wallet set: ${signer.address} (${balance} ETH)` )

            if( balance < parseFloat( minEth ) ) {
                console.warn( '⚠ Facilitator ETH balance below minimum threshold' )
            }
        } else {
            throw new Error( 'Either privateKey or privateKeyMap is required' )
        }

        return this
    }


    #getProviderForNetwork( { network } ) {
        // First try exact match
        if( this.#providerMap.has( network ) ) {
            return this.#providerMap.get( network )
        }

        // Fall back to 'default' for single-network mode
        if( this.#providerMap.has( 'default' ) ) {
            return this.#providerMap.get( 'default' )
        }

        return null
    }


    #getWalletClientForNetwork( { network } ) {
        // First try exact match
        if( this.#walletClientMap.has( network ) ) {
            return this.#walletClientMap.get( network )
        }

        // Fall back to 'default' for single-network mode
        if( this.#walletClientMap.has( 'default' ) ) {
            return this.#walletClientMap.get( 'default' )
        }

        return null
    }


    static getPreparedPaymentOptionCatalog( { paymentOptionCatalog, serverPayToAddressMap, serverDefaultMaxTimeoutSeconds = 300, contractCatalog } ) {
        const preparedPaymentOptionCatalog = {}

        Object.entries( paymentOptionCatalog )
            .forEach( ( [ optionId, option ] ) => {
                const { contractId, amount, payTo, maxTimeoutSeconds } = option

                // Resolve payTo alias
                let resolvedPayTo = payTo
                if( payTo.startsWith( '{{' ) && payTo.endsWith( '}}' ) ) {
                    const aliasKey = payTo.slice( 2, -2 )
                    resolvedPayTo = serverPayToAddressMap[ aliasKey ]

                    if( !resolvedPayTo ) {
                        throw new Error( `PayTo alias "${aliasKey}" not found in serverPayToAddressMap` )
                    }
                }

                // Derive network from contract
                const contract = contractCatalog[ contractId ]
                if( !contract ) {
                    throw new Error( `Contract "${contractId}" not found in contractCatalog` )
                }

                const derivedPaymentNetworkId = contract.paymentNetworkId

                preparedPaymentOptionCatalog[ optionId ] = {
                    contractId,
                    amount,
                    payTo: resolvedPayTo,
                    maxTimeoutSeconds: maxTimeoutSeconds || serverDefaultMaxTimeoutSeconds,
                    derivedPaymentNetworkId,
                    assetTransferMethod: option.assetTransferMethod || null
                }
            } )

        return { preparedPaymentOptionCatalog }
    }


    static getPaymentRequiredResponsePayload( { monetizedResourceDescriptor, acceptedPaymentOptionIdList, preparedPaymentOptionCatalog, contractCatalog } ) {
        const accepts = acceptedPaymentOptionIdList
            .map( ( optionId ) => {
                const option = preparedPaymentOptionCatalog[ optionId ]

                if( !option ) {
                    throw new Error( `Payment option "${optionId}" not found in preparedPaymentOptionCatalog` )
                }

                const { contractId, amount, payTo, maxTimeoutSeconds, derivedPaymentNetworkId, assetTransferMethod } = option
                const contract = contractCatalog[ contractId ]

                if( !contract ) {
                    throw new Error( `Contract "${contractId}" not found in contractCatalog` )
                }

                const { address, domainName, domainVersion } = contract

                return {
                    scheme: 'exact',
                    network: derivedPaymentNetworkId,
                    amount,
                    asset: address,
                    payTo,
                    maxTimeoutSeconds,
                    extra: {
                        name: domainName,
                        version: domainVersion,
                        assetTransferMethod: assetTransferMethod || 'transferWithAuthorization'
                    }
                }
            } )

        const { paymentRequired } = PaymentRequired
            .createPaymentRequiredObject( {
                resource: monetizedResourceDescriptor,
                accepts
            } )

        return { paymentRequiredResponsePayload: paymentRequired }
    }


    decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode } ) {
        const { decodedPaymentSignatureRequestPayload } = PaymentHeaders
            .decodePaymentSignatureHeaderValue( { paymentSignatureHeaderValueToDecode } )

        return { decodedPaymentSignatureRequestPayload }
    }


    async validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate, paymentRequiredResponsePayload } ) {
        const validationIssueList = []

        // Validate payload shape
        const { validationOk: shapeOk, validationIssueList: shapeIssues } = PaymentPayload
            .validatePaymentPayloadObjectShape( { paymentPayloadObjectToValidate: decodedPaymentSignatureRequestPayloadToValidate } )

        if( !shapeOk ) {
            return {
                paymentSignatureRequestPayloadValidationOutcome: {
                    validationOk: false,
                    validationIssueList: shapeIssues,
                    matchedPaymentRequirementsFromClientPayload: null
                }
            }
        }

        const { accepted, payload, resource } = decodedPaymentSignatureRequestPayloadToValidate
        const { authorization, signature } = payload
        const { resource: expectedResource, accepts } = paymentRequiredResponsePayload

        // Validate resource matches
        if( resource !== expectedResource ) {
            validationIssueList.push( {
                issuePath: 'resource',
                issueCode: ErrorCodes.INVALID_PAYLOAD,
                issueMessage: `Resource mismatch: expected "${expectedResource}", got "${resource}"`
            } )
        }

        // Match accepted against server's accepts
        const matchedRequirement = accepts
            .find( ( req ) =>
                req.scheme === accepted.scheme &&
                req.network === accepted.network &&
                req.asset.toLowerCase() === accepted.asset.toLowerCase() &&
                req.payTo.toLowerCase() === accepted.payTo.toLowerCase()
            )

        if( !matchedRequirement ) {
            validationIssueList.push( {
                issuePath: 'accepted',
                issueCode: ErrorCodes.INVALID_PAYMENT_REQUIREMENTS,
                issueMessage: 'Accepted payment option does not match any server requirement'
            } )

            return {
                paymentSignatureRequestPayloadValidationOutcome: {
                    validationOk: false,
                    validationIssueList,
                    matchedPaymentRequirementsFromClientPayload: null
                }
            }
        }

        // Check if we have a provider for this network
        const providerEntry = this.#getProviderForNetwork( { network: accepted.network } )
        if( !providerEntry ) {
            validationIssueList.push( {
                issuePath: 'accepted.network',
                issueCode: ErrorCodes.INVALID_NETWORK,
                issueMessage: `No provider configured for network "${accepted.network}"`
            } )

            return {
                paymentSignatureRequestPayloadValidationOutcome: {
                    validationOk: false,
                    validationIssueList,
                    matchedPaymentRequirementsFromClientPayload: null
                }
            }
        }

        // Validate amount is sufficient
        const authorizationValue = BigInt( authorization.value )
        const requiredAmount = BigInt( matchedRequirement.amount )

        if( authorizationValue < requiredAmount ) {
            validationIssueList.push( {
                issuePath: 'payload.authorization.value',
                issueCode: ErrorCodes.INVALID_EXACT_EVM_PAYLOAD_VALUE,
                issueMessage: `Insufficient payment amount: required ${requiredAmount}, got ${authorizationValue}`
            } )
        }

        // Validate time window
        const now = BigInt( Math.floor( Date.now() / 1000 ) )
        const validAfter = BigInt( authorization.validAfter )
        const validBefore = BigInt( authorization.validBefore )

        if( now < validAfter ) {
            validationIssueList.push( {
                issuePath: 'payload.authorization.validAfter',
                issueCode: ErrorCodes.INVALID_EXACT_EVM_PAYLOAD_TIMEOUT,
                issueMessage: 'Authorization is not yet valid'
            } )
        }

        if( now > validBefore ) {
            validationIssueList.push( {
                issuePath: 'payload.authorization.validBefore',
                issueCode: ErrorCodes.INVALID_EXACT_EVM_PAYLOAD_TIMEOUT,
                issueMessage: 'Authorization has expired'
            } )
        }

        // Check nonce reuse (but don't mark yet - only after successful settlement)
        const nonceKey = `${authorization.from.toLowerCase()}-${authorization.nonce.toLowerCase()}`
        if( this.#nonceStore.isUsed( { nonceKey } ) ) {
            validationIssueList.push( {
                issuePath: 'payload.authorization.nonce',
                issueCode: ErrorCodes.INVALID_EXACT_EVM_PAYLOAD_NONCE,
                issueMessage: 'Nonce already used (replay detected)'
            } )
        }

        // Validate payTo matches
        if( authorization.to.toLowerCase() !== accepted.payTo.toLowerCase() ) {
            validationIssueList.push( {
                issuePath: 'payload.authorization.to',
                issueCode: ErrorCodes.INVALID_PAYLOAD,
                issueMessage: 'Authorization "to" does not match accepted "payTo"'
            } )
        }

        // EIP-3009 Signature Verification
        const signatureVerificationResult = await this.#verifyEip3009Signature( {
            authorization,
            signature,
            accepted,
            matchedRequirement
        } )

        if( !signatureVerificationResult.valid ) {
            validationIssueList.push( {
                issuePath: 'payload.signature',
                issueCode: ErrorCodes.INVALID_EXACT_EVM_PAYLOAD_SIGNATURE,
                issueMessage: signatureVerificationResult.error
            } )
        }

        const validationOk = validationIssueList.length === 0

        if( validationOk ) {
            this.#log( '✅ Payment signature validated successfully' )
        }

        return {
            paymentSignatureRequestPayloadValidationOutcome: {
                validationOk,
                validationIssueList,
                matchedPaymentRequirementsFromClientPayload: matchedRequirement
            }
        }
    }


    async #verifyEip3009Signature( { authorization, signature, accepted, matchedRequirement } ) {
        try {
            // Parse chainId from network
            const { parsedChainIdNumber, parseError } = EvmNetworkParsing
                .parseEip155NetworkId( { paymentNetworkIdToParse: accepted.network } )

            if( parseError ) {
                return { valid: false, error: `Failed to parse network: ${parseError}` }
            }

            // Get domain info from matchedRequirement.extra
            const { name: domainName, version: domainVersion } = matchedRequirement.extra || {}

            if( !domainName || !domainVersion ) {
                return { valid: false, error: 'Missing domain info (name/version) in payment requirement' }
            }

            const domain = {
                name: domainName,
                version: domainVersion,
                chainId: parsedChainIdNumber,
                verifyingContract: accepted.asset
            }

            const types = {
                TransferWithAuthorization: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'validAfter', type: 'uint256' },
                    { name: 'validBefore', type: 'uint256' },
                    { name: 'nonce', type: 'bytes32' }
                ]
            }

            const message = {
                from: authorization.from,
                to: authorization.to,
                value: BigInt( authorization.value ),
                validAfter: BigInt( authorization.validAfter ),
                validBefore: BigInt( authorization.validBefore ),
                nonce: authorization.nonce
            }

            const recoveredAddress = await recoverTypedDataAddress( {
                domain,
                types,
                primaryType: 'TransferWithAuthorization',
                message,
                signature
            } )

            if( recoveredAddress.toLowerCase() !== authorization.from.toLowerCase() ) {
                return {
                    valid: false,
                    error: `Signature recovery mismatch: expected ${authorization.from}, recovered ${recoveredAddress}`
                }
            }

            return { valid: true }
        } catch( e ) {
            return { valid: false, error: `Signature verification failed: ${e.message}` }
        }
    }


    async simulateTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } ) {
        const { payload, accepted } = decodedPaymentSignatureRequestPayload
        const { authorization, signature } = payload
        const tokenAddress = accepted.asset

        // Get provider for this network
        const providerEntry = this.#getProviderForNetwork( { network: accepted.network } )
        if( !providerEntry ) {
            return {
                paymentSimulationOutcome: {
                    simulationOk: false,
                    simulationError: `No provider configured for network "${accepted.network}"`,
                    errorCode: ErrorCodes.INVALID_NETWORK
                }
            }
        }

        const { from, to, nonce } = authorization
        const value = BigInt( authorization.value )
        const validAfter = BigInt( authorization.validAfter )
        const validBefore = BigInt( authorization.validBefore )

        const { v, r, s } = this.#splitVRS( signature )

        const data = encodeFunctionData( {
            abi: this.#abi,
            functionName: 'transferWithAuthorization',
            args: [ from, to, value, validAfter, validBefore, nonce, v, r, s ]
        } )

        try {
            await providerEntry.provider.call( { to: tokenAddress, data } )
            this.#log( '✅ Simulation successful' )

            return { paymentSimulationOutcome: { simulationOk: true } }
        } catch( e ) {
            this.#log( `❌ Simulation failed: ${e.message}` )

            return {
                paymentSimulationOutcome: {
                    simulationOk: false,
                    simulationError: e.message,
                    errorCode: ErrorCodes.SIMULATION_FAILED
                }
            }
        }
    }


    async settleTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } ) {
        const { payload, accepted } = decodedPaymentSignatureRequestPayload
        const { authorization, signature } = payload
        const tokenAddress = accepted.asset

        // Get wallet client for this network
        const walletClient = this.#getWalletClientForNetwork( { network: accepted.network } )
        if( !walletClient ) {
            const { settlementResponse } = SettlementResponse
                .createFailureSettlementResponse( { errorReason: `No wallet configured for network "${accepted.network}"` } )

            return {
                paymentSettlementOutcome: {
                    settlementOk: false,
                    settlementError: `No wallet configured for network "${accepted.network}"`,
                    errorCode: ErrorCodes.INVALID_NETWORK,
                    settlementResponse
                }
            }
        }

        const { from, to, nonce } = authorization
        const value = BigInt( authorization.value )
        const validAfter = BigInt( authorization.validAfter )
        const validBefore = BigInt( authorization.validBefore )

        const { v, r, s } = this.#splitVRS( signature )

        const data = encodeFunctionData( {
            abi: this.#abi,
            functionName: 'transferWithAuthorization',
            args: [ from, to, value, validAfter, validBefore, nonce, v, r, s ]
        } )

        try {
            const hash = await walletClient.sendTransaction( {
                to: tokenAddress,
                data
            } )

            // Mark nonce as used AFTER successful settlement
            const nonceKey = `${from.toLowerCase()}-${nonce.toLowerCase()}`
            this.#nonceStore.markUsed( { nonceKey } )

            this.#log( `✅ Settlement broadcasted: ${hash}` )

            const { settlementResponse } = SettlementResponse
                .createSuccessSettlementResponse( {
                    transaction: hash,
                    network: accepted.network,
                    payer: from
                } )

            return { paymentSettlementOutcome: { settlementOk: true, settlementResponse } }
        } catch( e ) {
            this.#log( `❌ Settlement failed: ${e.message}` )

            const { settlementResponse } = SettlementResponse
                .createFailureSettlementResponse( { errorReason: e.message } )

            return {
                paymentSettlementOutcome: {
                    settlementOk: false,
                    settlementError: e.message,
                    errorCode: ErrorCodes.SETTLEMENT_FAILED,
                    settlementResponse
                }
            }
        }
    }


    createPaymentResponseHeader( { paymentResponseSettlementPayload } ) {
        const { paymentResponseHeaderValue } = PaymentHeaders
            .encodePaymentResponseHeaderValue( { paymentResponseSettlementPayloadToEncode: paymentResponseSettlementPayload } )

        this.#log( '✅ PAYMENT-RESPONSE header created' )

        return { paymentResponseHeaderValue }
    }


    #splitVRS( signatureHex ) {
        const sig = signatureHex.startsWith( '0x' ) ? signatureHex.slice( 2 ) : signatureHex
        const r = '0x' + sig.slice( 0, 64 )
        const s = '0x' + sig.slice( 64, 128 )
        const v = parseInt( sig.slice( 128, 130 ), 16 )

        return { v, r, s }
    }


    #log( message ) {
        if( !this.#silent ) {
            console.log( message )
        }
    }
}


export { ServerExact, NonceStore }
