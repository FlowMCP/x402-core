// Configuration Validator for X402 v2 exact/evm

import { ErrorCodes } from '../errors/errorCodes.mjs'


class ConfigValidator {
    static validateX402V2ExactEvmConfiguration( { contractCatalog, paymentOptionCatalog, restrictedCalls = [] } ) {
        const configurationValidationIssueList = []

        // Validate contractCatalog
        if( contractCatalog === undefined || contractCatalog === null ) {
            configurationValidationIssueList.push( {
                issuePath: 'contractCatalog',
                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                issueMessage: 'contractCatalog is required'
            } )
        } else if( typeof contractCatalog !== 'object' || Array.isArray( contractCatalog ) ) {
            configurationValidationIssueList.push( {
                issuePath: 'contractCatalog',
                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                issueMessage: 'contractCatalog must be an object'
            } )
        } else {
            const contractIssues = ConfigValidator.#validateContractCatalog( { contractCatalog } )
            configurationValidationIssueList.push( ...contractIssues )
        }

        // Validate paymentOptionCatalog
        if( paymentOptionCatalog === undefined || paymentOptionCatalog === null ) {
            configurationValidationIssueList.push( {
                issuePath: 'paymentOptionCatalog',
                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                issueMessage: 'paymentOptionCatalog is required'
            } )
        } else if( typeof paymentOptionCatalog !== 'object' || Array.isArray( paymentOptionCatalog ) ) {
            configurationValidationIssueList.push( {
                issuePath: 'paymentOptionCatalog',
                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                issueMessage: 'paymentOptionCatalog must be an object'
            } )
        } else if( contractCatalog && typeof contractCatalog === 'object' ) {
            const optionIssues = ConfigValidator.#validatePaymentOptionCatalog( { paymentOptionCatalog, contractCatalog } )
            configurationValidationIssueList.push( ...optionIssues )
        }

        // Validate restrictedCalls
        if( restrictedCalls !== undefined && !Array.isArray( restrictedCalls ) ) {
            configurationValidationIssueList.push( {
                issuePath: 'restrictedCalls',
                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                issueMessage: 'restrictedCalls must be an array'
            } )
        } else if( Array.isArray( restrictedCalls ) && paymentOptionCatalog ) {
            const callIssues = ConfigValidator.#validateRestrictedCalls( { restrictedCalls, paymentOptionCatalog } )
            configurationValidationIssueList.push( ...callIssues )
        }

        const configurationValidationOk = configurationValidationIssueList.length === 0

        return { configurationValidationOk, configurationValidationIssueList }
    }


    static #validateContractCatalog( { contractCatalog } ) {
        const issues = []

        Object.entries( contractCatalog )
            .forEach( ( [ contractId, contract ] ) => {
                const basePath = `contractCatalog.${contractId}`

                const requiredFields = [
                    [ 'paymentNetworkId', 'string' ],
                    [ 'address', 'string' ],
                    [ 'decimals', 'number' ],
                    [ 'domainName', 'string' ],
                    [ 'domainVersion', 'string' ]
                ]

                requiredFields
                    .forEach( ( [ field, expectedType ] ) => {
                        const value = contract[ field ]

                        if( value === undefined ) {
                            issues.push( {
                                issuePath: `${basePath}.${field}`,
                                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                                issueMessage: `${field} is required for contract ${contractId}`
                            } )
                        } else if( typeof value !== expectedType ) {
                            issues.push( {
                                issuePath: `${basePath}.${field}`,
                                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                                issueMessage: `${field} must be a ${expectedType}`
                            } )
                        }
                    } )

                // Validate paymentNetworkId format (eip155:<chainId>)
                if( contract.paymentNetworkId && typeof contract.paymentNetworkId === 'string' ) {
                    if( !contract.paymentNetworkId.startsWith( 'eip155:' ) ) {
                        issues.push( {
                            issuePath: `${basePath}.paymentNetworkId`,
                            issueCode: ErrorCodes.INVALID_NETWORK,
                            issueMessage: `paymentNetworkId must start with "eip155:", got "${contract.paymentNetworkId}"`
                        } )
                    }
                }

                // Validate supportedAssetTransferMethodList if present
                if( contract.supportedAssetTransferMethodList !== undefined ) {
                    if( !Array.isArray( contract.supportedAssetTransferMethodList ) ) {
                        issues.push( {
                            issuePath: `${basePath}.supportedAssetTransferMethodList`,
                            issueCode: ErrorCodes.INVALID_CONFIGURATION,
                            issueMessage: 'supportedAssetTransferMethodList must be an array'
                        } )
                    }
                }
            } )

        return issues
    }


    static #validatePaymentOptionCatalog( { paymentOptionCatalog, contractCatalog } ) {
        const issues = []

        Object.entries( paymentOptionCatalog )
            .forEach( ( [ optionId, option ] ) => {
                const basePath = `paymentOptionCatalog.${optionId}`

                // Check required fields
                const requiredFields = [
                    [ 'contractId', 'string' ],
                    [ 'amount', 'string' ],
                    [ 'payTo', 'string' ]
                ]

                requiredFields
                    .forEach( ( [ field, expectedType ] ) => {
                        const value = option[ field ]

                        if( value === undefined ) {
                            issues.push( {
                                issuePath: `${basePath}.${field}`,
                                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                                issueMessage: `${field} is required for payment option ${optionId}`
                            } )
                        } else if( typeof value !== expectedType ) {
                            issues.push( {
                                issuePath: `${basePath}.${field}`,
                                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                                issueMessage: `${field} must be a ${expectedType}`
                            } )
                        }
                    } )

                // Validate contractId references existing contract
                if( option.contractId && !contractCatalog[ option.contractId ] ) {
                    issues.push( {
                        issuePath: `${basePath}.contractId`,
                        issueCode: ErrorCodes.INVALID_CONFIGURATION,
                        issueMessage: `contractId "${option.contractId}" not found in contractCatalog`
                    } )
                }

                // Validate assetTransferMethod if present
                if( option.assetTransferMethod !== undefined ) {
                    const contract = contractCatalog[ option.contractId ]
                    if( contract && contract.supportedAssetTransferMethodList ) {
                        if( !contract.supportedAssetTransferMethodList.includes( option.assetTransferMethod ) ) {
                            issues.push( {
                                issuePath: `${basePath}.assetTransferMethod`,
                                issueCode: ErrorCodes.INVALID_CONFIGURATION,
                                issueMessage: `assetTransferMethod "${option.assetTransferMethod}" is not in contract's supportedAssetTransferMethodList`
                            } )
                        }
                    }
                }

                // Validate expectedPaymentNetworkId guard if present
                if( option.expectedPaymentNetworkId !== undefined && option.contractId ) {
                    const contract = contractCatalog[ option.contractId ]
                    if( contract && contract.paymentNetworkId !== option.expectedPaymentNetworkId ) {
                        issues.push( {
                            issuePath: `${basePath}.expectedPaymentNetworkId`,
                            issueCode: ErrorCodes.INVALID_NETWORK,
                            issueMessage: `expectedPaymentNetworkId "${option.expectedPaymentNetworkId}" does not match derived network "${contract.paymentNetworkId}"`
                        } )
                    }
                }
            } )

        return issues
    }


    static #validateRestrictedCalls( { restrictedCalls, paymentOptionCatalog } ) {
        const issues = []

        restrictedCalls
            .forEach( ( call, index ) => {
                const basePath = `restrictedCalls[${index}]`

                if( call.acceptedPaymentOptionIdList === undefined ) {
                    issues.push( {
                        issuePath: `${basePath}.acceptedPaymentOptionIdList`,
                        issueCode: ErrorCodes.INVALID_CONFIGURATION,
                        issueMessage: 'acceptedPaymentOptionIdList is required'
                    } )
                } else if( !Array.isArray( call.acceptedPaymentOptionIdList ) ) {
                    issues.push( {
                        issuePath: `${basePath}.acceptedPaymentOptionIdList`,
                        issueCode: ErrorCodes.INVALID_CONFIGURATION,
                        issueMessage: 'acceptedPaymentOptionIdList must be an array'
                    } )
                } else {
                    call.acceptedPaymentOptionIdList
                        .forEach( ( optionId, optionIndex ) => {
                            if( !paymentOptionCatalog[ optionId ] ) {
                                issues.push( {
                                    issuePath: `${basePath}.acceptedPaymentOptionIdList[${optionIndex}]`,
                                    issueCode: ErrorCodes.INVALID_CONFIGURATION,
                                    issueMessage: `payment option "${optionId}" not found in paymentOptionCatalog`
                                } )
                            }
                        } )
                }
            } )

        return issues
    }
}


export { ConfigValidator }
