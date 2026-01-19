// GitHub CI Test - Static Method Tests (No Blockchain Transactions)
// Tests v1 (legacy) and v2 static methods

// ═══════════════════════════════════════════════════════════════════════════════
// v1 LEGACY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

import { ClientExact as ClientExactV1, ServerExact as ServerExactV1 } from './../src/legacy/index.mjs'

console.log( '═══════════════════════════════════════════════════════════════════' )
console.log( '  x402-core GitHub CI Tests' )
console.log( '═══════════════════════════════════════════════════════════════════' )
console.log( '' )

// ─────────────────────────────────────────────────────────────────────
// v1 Tests
// ─────────────────────────────────────────────────────────────────────

console.log( '1️⃣  v1 (Legacy) Static Method Tests' )
console.log( '' )

const v1Config = {
    'chainId': '84532',
    'chainName': 'base-sepolia',
    'paymentOptions': {
        'usdc-sepolia': {
            'contractId': 'usdc-sepolia',
            'maxAmountRequired': '0.01',
            'payTo': '{{payTo1}}'
        }
    },
    'activePaymentOptions': [ 'usdc-sepolia' ],
    'contracts': {
        'usdc-sepolia': {
            'domainName': 'USDC',
            'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'assetType': 'erc20',
            'decimals': 6
        }
    },
    'serverCredentials': {
        'payTo1': '0x1234567890123456789012345678901234567890',
        'serverProviderUrl': 'https://base-sepolia.example.com'
    },
    'allowedPaymentOptions': [
        {
            'name': 'USDC',
            'tokenAddress': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'decimals': 6,
            'maxAmountRequired': '0.01'
        }
    ]
}

// Test v1 ServerExact.getPreparedPaymentOptions
try {
    const { preparedPaymentOptions } = ServerExactV1
        .getPreparedPaymentOptions( {
            paymentOptions: v1Config.paymentOptions,
            activePaymentOptions: v1Config.activePaymentOptions,
            serverCredentials: v1Config.serverCredentials
        } )

    if( !preparedPaymentOptions || Object.keys( preparedPaymentOptions ).length === 0 ) {
        throw new Error( 'preparedPaymentOptions is empty' )
    }

    console.log( '   ✅ v1 ServerExact.getPreparedPaymentOptions()' )
} catch( e ) {
    console.log( '   ❌ v1 ServerExact.getPreparedPaymentOptions():', e.message )
    process.exit( 1 )
}

// Test v1 ServerExact.getPaymentRequirementsPayload
try {
    const { preparedPaymentOptions } = ServerExactV1
        .getPreparedPaymentOptions( {
            paymentOptions: v1Config.paymentOptions,
            activePaymentOptions: v1Config.activePaymentOptions,
            serverCredentials: v1Config.serverCredentials
        } )

    const { paymentRequirementsPayload } = ServerExactV1
        .getPaymentRequirementsPayload( {
            chainId: v1Config.chainId,
            chainName: v1Config.chainName,
            preparedPaymentOptions,
            contracts: v1Config.contracts,
            resource: 'test-resource'
        } )

    if( !paymentRequirementsPayload || !paymentRequirementsPayload.accepts ) {
        throw new Error( 'paymentRequirementsPayload is invalid' )
    }

    console.log( '   ✅ v1 ServerExact.getPaymentRequirementsPayload()' )
} catch( e ) {
    console.log( '   ❌ v1 ServerExact.getPaymentRequirementsPayload():', e.message )
    process.exit( 1 )
}

// Test v1 ClientExact.selectMatchingPaymentOption
try {
    const { preparedPaymentOptions } = ServerExactV1
        .getPreparedPaymentOptions( {
            paymentOptions: v1Config.paymentOptions,
            activePaymentOptions: v1Config.activePaymentOptions,
            serverCredentials: v1Config.serverCredentials
        } )

    const { paymentRequirementsPayload } = ServerExactV1
        .getPaymentRequirementsPayload( {
            chainId: v1Config.chainId,
            chainName: v1Config.chainName,
            preparedPaymentOptions,
            contracts: v1Config.contracts,
            resource: 'test-resource'
        } )

    const { paymentOption } = ClientExactV1
        .selectMatchingPaymentOption( {
            paymentRequirementsPayload,
            allowedPaymentOptions: v1Config.allowedPaymentOptions,
            chainId: v1Config.chainId
        } )

    if( !paymentOption ) {
        throw new Error( 'No payment option selected' )
    }

    console.log( '   ✅ v1 ClientExact.selectMatchingPaymentOption()' )
} catch( e ) {
    console.log( '   ❌ v1 ClientExact.selectMatchingPaymentOption():', e.message )
    process.exit( 1 )
}

console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// v2 TESTS
// ═══════════════════════════════════════════════════════════════════════════════

import { ClientExact as ClientExactV2, ServerExact as ServerExactV2 } from './../src/v2/exact/evm/index.mjs'

console.log( '2️⃣  v2 Static Method Tests' )
console.log( '' )

const v2Config = {
    'contractCatalog': {
        'usdc-base-sepolia': {
            'paymentNetworkId': 'eip155:84532',
            'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            'decimals': 6,
            'domainName': 'USDC',
            'domainVersion': '2'
        },
        'usdc-avalanche-fuji': {
            'paymentNetworkId': 'eip155:43113',
            'address': '0x5425890298aed601595a70AB815c96711a31Bc65',
            'decimals': 6,
            'domainName': 'USDC',
            'domainVersion': '2'
        }
    },
    'paymentOptionCatalog': {
        'base-usdc-10k': {
            'contractId': 'usdc-base-sepolia',
            'amount': '10000',
            'payTo': '{{facilitator}}',
            'maxTimeoutSeconds': 300
        },
        'avax-usdc-10k': {
            'contractId': 'usdc-avalanche-fuji',
            'amount': '10000',
            'payTo': '{{facilitator}}',
            'maxTimeoutSeconds': 300
        },
        'avax-usdc-5k': {
            'contractId': 'usdc-avalanche-fuji',
            'amount': '5000',
            'payTo': '{{facilitator}}',
            'maxTimeoutSeconds': 300
        }
    },
    'acceptedPaymentOptionIdList': [ 'base-usdc-10k', 'avax-usdc-10k', 'avax-usdc-5k' ],
    'serverPayToAddressMap': {
        'facilitator': '0x1234567890123456789012345678901234567890'
    },
    'monetizedResourceDescriptor': 'mcp://tool/premium_tool'
}

// Test v2 ServerExact.getPreparedPaymentOptionCatalog
try {
    const { preparedPaymentOptionCatalog } = ServerExactV2
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog: v2Config.paymentOptionCatalog,
            serverPayToAddressMap: v2Config.serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog: v2Config.contractCatalog
        } )

    if( !preparedPaymentOptionCatalog || Object.keys( preparedPaymentOptionCatalog ).length === 0 ) {
        throw new Error( 'preparedPaymentOptionCatalog is empty' )
    }

    // Verify alias resolution
    const baseOption = preparedPaymentOptionCatalog[ 'base-usdc-10k' ]
    if( baseOption.payTo !== v2Config.serverPayToAddressMap.facilitator ) {
        throw new Error( 'Alias resolution failed' )
    }

    // Verify network derivation
    if( baseOption.derivedPaymentNetworkId !== 'eip155:84532' ) {
        throw new Error( 'Network derivation failed' )
    }

    console.log( '   ✅ v2 ServerExact.getPreparedPaymentOptionCatalog()' )
} catch( e ) {
    console.log( '   ❌ v2 ServerExact.getPreparedPaymentOptionCatalog():', e.message )
    process.exit( 1 )
}

// Test v2 ServerExact.getPaymentRequiredResponsePayload
try {
    const { preparedPaymentOptionCatalog } = ServerExactV2
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog: v2Config.paymentOptionCatalog,
            serverPayToAddressMap: v2Config.serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog: v2Config.contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExactV2
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor: v2Config.monetizedResourceDescriptor,
            acceptedPaymentOptionIdList: v2Config.acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog: v2Config.contractCatalog
        } )

    if( !paymentRequiredResponsePayload || !paymentRequiredResponsePayload.accepts ) {
        throw new Error( 'paymentRequiredResponsePayload is invalid' )
    }

    // Verify multi-network options
    const networks = paymentRequiredResponsePayload.accepts
        .map( ( opt ) => opt.network )

    if( !networks.includes( 'eip155:84532' ) || !networks.includes( 'eip155:43113' ) ) {
        throw new Error( 'Multi-network options missing' )
    }

    // Verify extra field with domain info
    const firstOption = paymentRequiredResponsePayload.accepts[ 0 ]
    if( !firstOption.extra || !firstOption.extra.name || !firstOption.extra.version ) {
        throw new Error( 'Extra domain info missing' )
    }

    console.log( '   ✅ v2 ServerExact.getPaymentRequiredResponsePayload()' )
} catch( e ) {
    console.log( '   ❌ v2 ServerExact.getPaymentRequiredResponsePayload():', e.message )
    process.exit( 1 )
}

// Test v2 ClientExact.selectMatchingPaymentOption - Base Sepolia only
try {
    const { preparedPaymentOptionCatalog } = ServerExactV2
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog: v2Config.paymentOptionCatalog,
            serverPayToAddressMap: v2Config.serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog: v2Config.contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExactV2
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor: v2Config.monetizedResourceDescriptor,
            acceptedPaymentOptionIdList: v2Config.acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog: v2Config.contractCatalog
        } )

    const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExactV2
        .selectMatchingPaymentOption( {
            paymentRequiredResponsePayload,
            clientSupportedPaymentNetworkIdList: [ 'eip155:84532' ],
            clientAllowedAssetConstraintList: [
                { 'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'maxAmount': '1000000' }
            ],
            paymentOptionSelectionPolicy: null
        } )

    if( !selectedPaymentRequirements ) {
        throw new Error( 'No payment option selected' )
    }

    if( selectedPaymentRequirements.network !== 'eip155:84532' ) {
        throw new Error( 'Wrong network selected' )
    }

    console.log( '   ✅ v2 ClientExact.selectMatchingPaymentOption() - Base Sepolia' )
} catch( e ) {
    console.log( '   ❌ v2 ClientExact.selectMatchingPaymentOption() - Base Sepolia:', e.message )
    process.exit( 1 )
}

// Test v2 ClientExact.selectMatchingPaymentOption - Avalanche Fuji only
try {
    const { preparedPaymentOptionCatalog } = ServerExactV2
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog: v2Config.paymentOptionCatalog,
            serverPayToAddressMap: v2Config.serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog: v2Config.contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExactV2
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor: v2Config.monetizedResourceDescriptor,
            acceptedPaymentOptionIdList: v2Config.acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog: v2Config.contractCatalog
        } )

    const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExactV2
        .selectMatchingPaymentOption( {
            paymentRequiredResponsePayload,
            clientSupportedPaymentNetworkIdList: [ 'eip155:43113' ],
            clientAllowedAssetConstraintList: [
                { 'asset': '0x5425890298aed601595a70AB815c96711a31Bc65', 'maxAmount': '1000000' }
            ],
            paymentOptionSelectionPolicy: null
        } )

    if( !selectedPaymentRequirements ) {
        throw new Error( 'No payment option selected' )
    }

    if( selectedPaymentRequirements.network !== 'eip155:43113' ) {
        throw new Error( 'Wrong network selected' )
    }

    console.log( '   ✅ v2 ClientExact.selectMatchingPaymentOption() - Avalanche Fuji' )
} catch( e ) {
    console.log( '   ❌ v2 ClientExact.selectMatchingPaymentOption() - Avalanche Fuji:', e.message )
    process.exit( 1 )
}

// Test v2 ClientExact.selectMatchingPaymentOption - Multi-Network
try {
    const { preparedPaymentOptionCatalog } = ServerExactV2
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog: v2Config.paymentOptionCatalog,
            serverPayToAddressMap: v2Config.serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog: v2Config.contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExactV2
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor: v2Config.monetizedResourceDescriptor,
            acceptedPaymentOptionIdList: v2Config.acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog: v2Config.contractCatalog
        } )

    const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExactV2
        .selectMatchingPaymentOption( {
            paymentRequiredResponsePayload,
            clientSupportedPaymentNetworkIdList: [ 'eip155:84532', 'eip155:43113' ],
            clientAllowedAssetConstraintList: [
                { 'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'maxAmount': '1000000' },
                { 'asset': '0x5425890298aed601595a70AB815c96711a31Bc65', 'maxAmount': '1000000' }
            ],
            paymentOptionSelectionPolicy: null
        } )

    if( !selectedPaymentRequirements ) {
        throw new Error( 'No payment option selected' )
    }

    // Should have multiple candidates
    if( paymentOptionSelectionDiagnostics.candidatesAfterFilter < 2 ) {
        throw new Error( 'Multi-network filtering failed' )
    }

    console.log( '   ✅ v2 ClientExact.selectMatchingPaymentOption() - Multi-Network' )
} catch( e ) {
    console.log( '   ❌ v2 ClientExact.selectMatchingPaymentOption() - Multi-Network:', e.message )
    process.exit( 1 )
}

// Test v2 ClientExact.selectMatchingPaymentOption - No Match
try {
    const { preparedPaymentOptionCatalog } = ServerExactV2
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog: v2Config.paymentOptionCatalog,
            serverPayToAddressMap: v2Config.serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog: v2Config.contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExactV2
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor: v2Config.monetizedResourceDescriptor,
            acceptedPaymentOptionIdList: v2Config.acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog: v2Config.contractCatalog
        } )

    // Try to select with unsupported network
    const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExactV2
        .selectMatchingPaymentOption( {
            paymentRequiredResponsePayload,
            clientSupportedPaymentNetworkIdList: [ 'eip155:999999' ],  // Non-existent network
            clientAllowedAssetConstraintList: [],
            paymentOptionSelectionPolicy: null
        } )

    if( selectedPaymentRequirements !== null ) {
        throw new Error( 'Should not have selected an option' )
    }

    if( paymentOptionSelectionDiagnostics.candidatesAfterFilter !== 0 ) {
        throw new Error( 'Should have 0 candidates' )
    }

    console.log( '   ✅ v2 ClientExact.selectMatchingPaymentOption() - No Match' )
} catch( e ) {
    console.log( '   ❌ v2 ClientExact.selectMatchingPaymentOption() - No Match:', e.message )
    process.exit( 1 )
}

// Test v2 ClientExact.createPaymentPayloadObject
try {
    const mockSelectedPaymentRequirements = {
        'scheme': 'exact',
        'network': 'eip155:84532',
        'amount': '10000',
        'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        'payTo': '0x1234567890123456789012345678901234567890'
    }

    const mockAuthorization = {
        'from': '0xabc1234567890123456789012345678901234567',
        'to': '0x1234567890123456789012345678901234567890',
        'value': BigInt( 10000 ),
        'validAfter': BigInt( 1700000000 ),
        'validBefore': BigInt( 1700000300 ),
        'nonce': '0x' + '0'.repeat( 64 )
    }

    const mockSignature = '0x' + 'ab'.repeat( 65 )

    const { paymentPayload } = ClientExactV2
        .createPaymentPayloadObject( {
            resource: 'mcp://tool/premium_tool',
            selectedPaymentRequirements: mockSelectedPaymentRequirements,
            exactEvmAuthorizationPayload: mockAuthorization,
            exactEvmAuthorizationSignature: mockSignature
        } )

    if( !paymentPayload || !paymentPayload.accepted || !paymentPayload.payload ) {
        throw new Error( 'paymentPayload structure invalid' )
    }

    if( paymentPayload.x402Version !== 2 ) {
        throw new Error( 'x402Version should be 2' )
    }

    console.log( '   ✅ v2 ClientExact.createPaymentPayloadObject()' )
} catch( e ) {
    console.log( '   ❌ v2 ClientExact.createPaymentPayloadObject():', e.message )
    process.exit( 1 )
}

console.log( '' )
console.log( '═══════════════════════════════════════════════════════════════════' )
console.log( '  All Tests Passed!' )
console.log( '═══════════════════════════════════════════════════════════════════' )

process.exit( 0 )
