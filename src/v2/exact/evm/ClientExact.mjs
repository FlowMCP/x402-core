// ClientExact v2 for exact/evm scheme
// Implements client-side payment flow with EIP-3009 authorization

import { createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { randomBytes } from 'crypto'

import { PaymentRequired } from '../../types/PaymentRequired.mjs'
import { PaymentPayload } from '../../types/PaymentPayload.mjs'
import { PaymentHeaders } from '../../transports/http/paymentHeaders.mjs'
import { SelectionPolicy } from './selectionPolicy.mjs'
import { EvmNetworkParsing } from './evmNetworkParsing.mjs'
import { ErrorCodes } from '../../errors/errorCodes.mjs'


class ClientExact {
    #provider
    #abi
    #clientSigner
    #silent


    constructor( { silent = false } = {} ) {
        this.#silent = silent
    }


    init( { providerUrl } ) {
        const provider = createPublicClient( { transport: http( providerUrl ) } )
        this.#provider = provider

        this.#abi = parseAbi( [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
        ] )

        this.#log( '✅ ClientExact v2 initialized' )

        return this
    }


    async setWallet( { privateKey } ) {
        const cleanHex = privateKey.startsWith( '0x' ) ? privateKey : `0x${privateKey}`
        this.#clientSigner = privateKeyToAccount( cleanHex )

        this.#log( `✅ Wallet set: ${this.#clientSigner.address}` )

        return this
    }


    decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode } ) {
        const { decodedPaymentRequiredResponsePayload } = PaymentHeaders
            .decodePaymentRequiredHeaderValue( { paymentRequiredHeaderValueToDecode } )

        return { decodedPaymentRequiredResponsePayload }
    }


    static validatePaymentRequiredResponsePayload( { paymentRequiredResponsePayloadToValidate } ) {
        const { validationOk, validationIssueList } = PaymentRequired
            .validatePaymentRequiredObjectShape( { paymentRequiredObjectToValidate: paymentRequiredResponsePayloadToValidate } )

        return { paymentRequiredResponsePayloadValidationOutcome: { validationOk, validationIssueList } }
    }


    static selectMatchingPaymentOption( { paymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy = null } ) {
        let totalServerOptions = 0
        let filteredByScheme = 0
        let filteredByNetwork = 0
        let filteredByAsset = 0
        let candidatesAfterFilter = 0

        const { accepts } = paymentRequiredResponsePayload

        if( !accepts || !Array.isArray( accepts ) ) {
            return {
                selectedPaymentRequirements: null,
                paymentOptionSelectionDiagnostics: {
                    totalServerOptions,
                    filteredByScheme,
                    filteredByNetwork,
                    filteredByAsset,
                    candidatesAfterFilter,
                    error: 'accepts is missing or not an array'
                }
            }
        }

        totalServerOptions = accepts.length

        // Filter by scheme (exact only)
        const exactOptions = accepts
            .filter( ( option ) => option.scheme === 'exact' )

        filteredByScheme = accepts.length - exactOptions.length

        // Filter by supported network
        const networkFilteredOptions = exactOptions
            .filter( ( option ) => {
                if( !clientSupportedPaymentNetworkIdList || clientSupportedPaymentNetworkIdList.length === 0 ) {
                    return true
                }

                return clientSupportedPaymentNetworkIdList.includes( option.network )
            } )

        filteredByNetwork = exactOptions.length - networkFilteredOptions.length

        // Filter by allowed asset constraints
        const assetFilteredOptions = networkFilteredOptions
            .filter( ( option ) => {
                if( !clientAllowedAssetConstraintList || clientAllowedAssetConstraintList.length === 0 ) {
                    return true
                }

                const assetMatch = clientAllowedAssetConstraintList
                    .find( ( constraint ) => {
                        const assetMatches = constraint.asset.toLowerCase() === option.asset.toLowerCase()

                        if( !assetMatches ) {
                            return false
                        }

                        if( constraint.maxAmount !== undefined ) {
                            const serverAmount = BigInt( option.amount )
                            const clientMaxAmount = BigInt( constraint.maxAmount )

                            return serverAmount <= clientMaxAmount
                        }

                        return true
                    } )

                return assetMatch !== undefined
            } )

        filteredByAsset = networkFilteredOptions.length - assetFilteredOptions.length
        candidatesAfterFilter = assetFilteredOptions.length

        if( assetFilteredOptions.length === 0 ) {
            return {
                selectedPaymentRequirements: null,
                paymentOptionSelectionDiagnostics: {
                    totalServerOptions,
                    filteredByScheme,
                    filteredByNetwork,
                    filteredByAsset,
                    candidatesAfterFilter,
                    errorCode: ErrorCodes.NO_MATCHING_PAYMENT_OPTION,
                    error: 'No matching payment option found after filtering'
                }
            }
        }

        // Select best option using policy
        const { selectedOption, selectionReason } = SelectionPolicy
            .selectBestOption( { candidateList: assetFilteredOptions, policy: paymentOptionSelectionPolicy } )

        return {
            selectedPaymentRequirements: selectedOption,
            paymentOptionSelectionDiagnostics: {
                totalServerOptions,
                filteredByScheme,
                filteredByNetwork,
                filteredByAsset,
                candidatesAfterFilter,
                selectionReason
            }
        }
    }


    async createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition = {} } ) {
        const { network, amount, asset, payTo, maxTimeoutSeconds, extra } = selectedPaymentRequirements
        const { validAfterOffsetSeconds = -30, validBeforeOffsetSeconds = null } = exactEvmAuthorizationTimeWindowDefinition

        // Parse network to get chainId
        const { parsedChainIdNumber, parseError } = EvmNetworkParsing
            .parseEip155NetworkId( { paymentNetworkIdToParse: network } )

        if( parseError ) {
            throw new Error( `Failed to parse network: ${parseError}` )
        }

        // Get domain info from extra
        const { name: domainName, version: domainVersion } = extra || {}

        if( !domainName || !domainVersion ) {
            throw new Error( 'extra.name and extra.version are required for EIP-3009 domain' )
        }

        const domain = {
            name: domainName,
            version: domainVersion,
            chainId: parsedChainIdNumber,
            verifyingContract: asset
        }

        const from = this.#clientSigner.address
        const to = payTo
        const value = BigInt( amount )
        const validAfter = BigInt( Math.floor( Date.now() / 1000 ) + validAfterOffsetSeconds )

        const effectiveTimeout = validBeforeOffsetSeconds !== null
            ? validBeforeOffsetSeconds
            : ( maxTimeoutSeconds || 300 )

        const validBefore = validAfter + BigInt( effectiveTimeout ) - BigInt( validAfterOffsetSeconds )
        const nonce = '0x' + randomBytes( 32 ).toString( 'hex' )

        const authorization = { from, to, value, validAfter, validBefore, nonce }

        const signature = await this.#clientSigner.signTypedData( {
            domain,
            types: {
                TransferWithAuthorization: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'validAfter', type: 'uint256' },
                    { name: 'validBefore', type: 'uint256' },
                    { name: 'nonce', type: 'bytes32' }
                ]
            },
            primaryType: 'TransferWithAuthorization',
            message: authorization
        } )

        this.#log( '✅ Authorization created' )

        return {
            exactEvmAuthorizationPayload: authorization,
            exactEvmAuthorizationSignature: signature
        }
    }


    createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode } ) {
        const { paymentSignatureHeaderValue } = PaymentHeaders
            .encodePaymentSignatureHeaderValue( { paymentSignatureRequestPayloadToEncode } )

        this.#log( '✅ PAYMENT-SIGNATURE header created' )

        return { paymentSignatureHeaderValue }
    }


    static createPaymentPayloadObject( { resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } ) {
        const accepted = {
            scheme: selectedPaymentRequirements.scheme,
            network: selectedPaymentRequirements.network,
            amount: selectedPaymentRequirements.amount,
            asset: selectedPaymentRequirements.asset,
            payTo: selectedPaymentRequirements.payTo
        }

        const { paymentPayload } = PaymentPayload
            .createPaymentPayloadObject( {
                resource,
                accepted,
                signature: exactEvmAuthorizationSignature,
                authorization: exactEvmAuthorizationPayload
            } )

        return { paymentPayload }
    }


    #log( message ) {
        if( !this.#silent ) {
            console.log( message )
        }
    }
}


export { ClientExact }
