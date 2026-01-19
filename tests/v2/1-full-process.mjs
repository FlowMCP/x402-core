// Multi-Chain Payment Options Test
// Demonstrates mixing payment options from different blockchains

import { ClientExact, ServerExact, NonceStore } from '../../src/v2/exact/evm/index.mjs'
import { PaymentHeaders } from '../../src/v2/transports/http/paymentHeaders.mjs'
import { ConfigValidator } from '../../src/v2/config/index.mjs'
import { EnvironmentManager } from './helpers/EnvironmentManager.mjs'


// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN CONFIGURATION
// Server accepts payments from MULTIPLE blockchains simultaneously
// ═══════════════════════════════════════════════════════════════════════════════

const multiChainConfig = {
    'server': {
        // Contract definitions for MULTIPLE chains
        'contractCatalog': {
            // Base Sepolia USDC
            'usdc-base-sepolia': {
                'paymentNetworkId': 'eip155:84532',
                'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                'decimals': 6,
                'domainName': 'USDC',
                'domainVersion': '2'
            },
            // Avalanche Fuji USDC (different chain!)
            'usdc-avalanche-fuji': {
                'paymentNetworkId': 'eip155:43113',
                'address': '0x5425890298aed601595a70AB815c96711a31Bc65',
                'decimals': 6,
                'domainName': 'USDC',
                'domainVersion': '2'
            },
            // Ethereum Sepolia USDC (yet another chain!)
            'usdc-ethereum-sepolia': {
                'paymentNetworkId': 'eip155:11155111',
                'address': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
                'decimals': 6,
                'domainName': 'USDC',
                'domainVersion': '2'
            }
        },

        // Payment options mixing DIFFERENT blockchains
        'paymentOptionCatalog': {
            'option-base-10k': {
                'contractId': 'usdc-base-sepolia',
                'amount': '10000',
                'payTo': '{{payTo1}}',
                'maxTimeoutSeconds': 300
            },
            'option-avax-10k': {
                'contractId': 'usdc-avalanche-fuji',
                'amount': '10000',
                'payTo': '{{payTo1}}',
                'maxTimeoutSeconds': 300
            },
            'option-eth-10k': {
                'contractId': 'usdc-ethereum-sepolia',
                'amount': '10000',
                'payTo': '{{payTo1}}',
                'maxTimeoutSeconds': 300
            },
            // Different price on Avalanche (cheaper!)
            'option-avax-5k': {
                'contractId': 'usdc-avalanche-fuji',
                'amount': '5000',
                'payTo': '{{payTo1}}',
                'maxTimeoutSeconds': 300
            }
        },

        // Server accepts ALL of these options
        'acceptedPaymentOptionIdList': [
            'option-base-10k',
            'option-avax-10k',
            'option-eth-10k',
            'option-avax-5k'
        ],

        'envSelection': [
            [ 'facilitatorPrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
            [ 'payTo1',                'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY'  ],
            [ 'serverProviderUrl',     'BASE_SEPOLIA_ALCHEMY_HTTP'        ]
        ]
    }
}

const envPath = './../../../../../.env'
const monetizedResourceDescriptor = 'https://api.example.com/premium-content'


console.log( '═══════════════════════════════════════════════════════════════════' )
console.log( '  MULTI-CHAIN PAYMENT OPTIONS TEST' )
console.log( '═══════════════════════════════════════════════════════════════════' )
console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// 1️⃣ SERVER: Build Payment Requirements with MIXED chains
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '1️⃣  SERVER: Building PaymentRequired with mixed blockchain options...' )
console.log( '' )

const { credentials: serverCredentials } = EnvironmentManager
    .getCredentials( { envPath, envSelection: multiChainConfig[ 'server' ][ 'envSelection' ] } )

const { contractCatalog, paymentOptionCatalog, acceptedPaymentOptionIdList } = multiChainConfig[ 'server' ]
const serverPayToAddressMap = { 'payTo1': serverCredentials.payTo1 }

const { preparedPaymentOptionCatalog } = ServerExact
    .getPreparedPaymentOptionCatalog( { paymentOptionCatalog, serverPayToAddressMap, serverDefaultMaxTimeoutSeconds: 300, contractCatalog } )

const { paymentRequiredResponsePayload } = ServerExact
    .getPaymentRequiredResponsePayload( { monetizedResourceDescriptor, acceptedPaymentOptionIdList, preparedPaymentOptionCatalog, contractCatalog } )

console.log( '   Server offers', paymentRequiredResponsePayload.accepts.length, 'payment options:' )
console.log( '' )

paymentRequiredResponsePayload.accepts
    .forEach( ( option, index ) => {
        const chainName = option.network === 'eip155:84532' ? 'Base Sepolia'
            : option.network === 'eip155:43113' ? 'Avalanche Fuji'
            : option.network === 'eip155:11155111' ? 'Ethereum Sepolia'
            : option.network

        const amountUsdc = ( parseInt( option.amount ) / 1000000 ).toFixed( 2 )

        console.log( `   [${index + 1}] ${chainName.padEnd( 16 )} | ${amountUsdc} USDC | ${option.asset.slice( 0, 10 )}...` )
    } )

console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// 2️⃣ CLIENT A: Only supports Base Sepolia
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '─────────────────────────────────────────────────────────────────────' )
console.log( '2️⃣  CLIENT A: Only supports Base Sepolia' )
console.log( '' )

const clientAConfig = {
    'clientSupportedPaymentNetworkIdList': [ 'eip155:84532' ],
    'clientAllowedAssetConstraintList': [
        { 'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'maxAmount': '1000000' }
    ]
}

const { selectedPaymentRequirements: clientASelection, paymentOptionSelectionDiagnostics: clientADiag } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientSupportedPaymentNetworkIdList: clientAConfig.clientSupportedPaymentNetworkIdList,
        clientAllowedAssetConstraintList: clientAConfig.clientAllowedAssetConstraintList,
        paymentOptionSelectionPolicy: null
    } )

console.log( '   Supported networks:', clientAConfig.clientSupportedPaymentNetworkIdList.join( ', ' ) )
console.log( '   Filtered by network:', clientADiag.filteredByNetwork, 'options removed' )
console.log( '   Candidates after filter:', clientADiag.candidatesAfterFilter )

if( clientASelection ) {
    console.log( '   ✅ Selected:', clientASelection.network, '-', clientASelection.amount, 'units' )
} else {
    console.log( '   ❌ No matching option found' )
}

console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// 3️⃣ CLIENT B: Only supports Avalanche Fuji
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '─────────────────────────────────────────────────────────────────────' )
console.log( '3️⃣  CLIENT B: Only supports Avalanche Fuji' )
console.log( '' )

const clientBConfig = {
    'clientSupportedPaymentNetworkIdList': [ 'eip155:43113' ],
    'clientAllowedAssetConstraintList': [
        { 'asset': '0x5425890298aed601595a70AB815c96711a31Bc65', 'maxAmount': '1000000' }
    ]
}

const { selectedPaymentRequirements: clientBSelection, paymentOptionSelectionDiagnostics: clientBDiag } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientSupportedPaymentNetworkIdList: clientBConfig.clientSupportedPaymentNetworkIdList,
        clientAllowedAssetConstraintList: clientBConfig.clientAllowedAssetConstraintList,
        paymentOptionSelectionPolicy: null
    } )

console.log( '   Supported networks:', clientBConfig.clientSupportedPaymentNetworkIdList.join( ', ' ) )
console.log( '   Filtered by network:', clientBDiag.filteredByNetwork, 'options removed' )
console.log( '   Candidates after filter:', clientBDiag.candidatesAfterFilter )

if( clientBSelection ) {
    console.log( '   ✅ Selected:', clientBSelection.network, '-', clientBSelection.amount, 'units' )
} else {
    console.log( '   ❌ No matching option found' )
}

console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// 4️⃣ CLIENT C: Supports MULTIPLE chains (Base + Avalanche)
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '─────────────────────────────────────────────────────────────────────' )
console.log( '4️⃣  CLIENT C: Supports MULTIPLE chains (Base + Avalanche)' )
console.log( '' )

const clientCConfig = {
    'clientSupportedPaymentNetworkIdList': [ 'eip155:84532', 'eip155:43113' ],
    'clientAllowedAssetConstraintList': [
        { 'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'maxAmount': '1000000' },
        { 'asset': '0x5425890298aed601595a70AB815c96711a31Bc65', 'maxAmount': '1000000' }
    ]
}

const { selectedPaymentRequirements: clientCSelection, paymentOptionSelectionDiagnostics: clientCDiag } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientSupportedPaymentNetworkIdList: clientCConfig.clientSupportedPaymentNetworkIdList,
        clientAllowedAssetConstraintList: clientCConfig.clientAllowedAssetConstraintList,
        paymentOptionSelectionPolicy: null
    } )

console.log( '   Supported networks:', clientCConfig.clientSupportedPaymentNetworkIdList.join( ', ' ) )
console.log( '   Filtered by network:', clientCDiag.filteredByNetwork, 'options removed' )
console.log( '   Candidates after filter:', clientCDiag.candidatesAfterFilter, '(multiple options available!)' )

if( clientCSelection ) {
    console.log( '   ✅ Selected:', clientCSelection.network, '-', clientCSelection.amount, 'units' )
    console.log( '   (Selection policy: first match - could be customized)' )
} else {
    console.log( '   ❌ No matching option found' )
}

console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// 5️⃣ CLIENT D: Only supports Ethereum Sepolia (no USDC approved)
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '─────────────────────────────────────────────────────────────────────' )
console.log( '5️⃣  CLIENT D: Supports Ethereum Sepolia but has no asset approved' )
console.log( '' )

const clientDConfig = {
    'clientSupportedPaymentNetworkIdList': [ 'eip155:11155111' ],
    'clientAllowedAssetConstraintList': []  // No assets approved!
}

const { selectedPaymentRequirements: clientDSelection, paymentOptionSelectionDiagnostics: clientDDiag } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientSupportedPaymentNetworkIdList: clientDConfig.clientSupportedPaymentNetworkIdList,
        clientAllowedAssetConstraintList: clientDConfig.clientAllowedAssetConstraintList,
        paymentOptionSelectionPolicy: null
    } )

console.log( '   Supported networks:', clientDConfig.clientSupportedPaymentNetworkIdList.join( ', ' ) )
console.log( '   Allowed assets: (empty - accepts anything)' )
console.log( '   Filtered by network:', clientDDiag.filteredByNetwork, 'options removed' )
console.log( '   Candidates after filter:', clientDDiag.candidatesAfterFilter )

if( clientDSelection ) {
    console.log( '   ✅ Selected:', clientDSelection.network, '-', clientDSelection.amount, 'units' )
} else {
    console.log( '   ❌ No matching option found' )
}

console.log( '' )


// ═══════════════════════════════════════════════════════════════════════════════
// 6️⃣ FULL FLOW: Client pays on Base Sepolia (real settlement)
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '─────────────────────────────────────────────────────────────────────' )
console.log( '6️⃣  FULL FLOW: Execute payment on Base Sepolia' )
console.log( '' )

const { credentials: clientCredentials, privateKey: clientPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: [
        [ 'clientPrivateKey',  'ACCOUNT_DEVELOPMENT_PRIVATE_KEY' ],
        [ 'clientProviderUrl', 'BASE_SEPOLIA_ALCHEMY_HTTP'       ]
    ] } )

const { privateKey: serverPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: multiChainConfig[ 'server' ][ 'envSelection' ] } )

// Client setup
const client = new ClientExact( { silent: true } )
    .init( { providerUrl: clientCredentials.clientProviderUrl } )
await client
    .setWallet( { privateKey: clientPrivateKey } )

// Client selects Base Sepolia option
const { selectedPaymentRequirements } = ClientExact
    .selectMatchingPaymentOption( {
        paymentRequiredResponsePayload,
        clientSupportedPaymentNetworkIdList: [ 'eip155:84532' ],
        clientAllowedAssetConstraintList: [
            { 'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'maxAmount': '1000000' }
        ],
        paymentOptionSelectionPolicy: null
    } )

console.log( '   Client selected:', selectedPaymentRequirements.network )

// Create authorization
const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
    .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 } } )

const { paymentPayload } = ClientExact
    .createPaymentPayloadObject( { resource: paymentRequiredResponsePayload.resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )

const { paymentSignatureHeaderValue } = client
    .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )

// Server setup with MULTI-NETWORK support
const nonceStore = new NonceStore()
const server = new ServerExact( { nonceStore, silent: true } )
    .init( {
        // In production: providerUrlMap with multiple networks
        // For this test: single provider (only Base Sepolia credentials available)
        providerUrl: serverCredentials.serverProviderUrl
    } )

await server
    .setWallet( { privateKey: serverPrivateKey } )

// Validate and settle
const { decodedPaymentSignatureRequestPayload } = server
    .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

const { paymentSignatureRequestPayloadValidationOutcome } = await server
    .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

if( !paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
    console.log( '   ❌ Validation failed:', paymentSignatureRequestPayloadValidationOutcome.validationIssueList )
    process.exit( 1 )
}

const { matchedPaymentRequirementsFromClientPayload } = paymentSignatureRequestPayloadValidationOutcome

const { paymentSimulationOutcome } = await server
    .simulateTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } )

if( !paymentSimulationOutcome.simulationOk ) {
    console.log( '   ❌ Simulation failed:', paymentSimulationOutcome.simulationError )
    process.exit( 1 )
}

const { paymentSettlementOutcome } = await server
    .settleTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } )

if( !paymentSettlementOutcome.settlementOk ) {
    console.log( '   ❌ Settlement failed:', paymentSettlementOutcome.settlementError )
    process.exit( 1 )
}

console.log( '   ✅ Settlement successful!' )
console.log( '   Transaction:', paymentSettlementOutcome.settlementResponse.transaction )
console.log( '   Network:', paymentSettlementOutcome.settlementResponse.network )

console.log( '' )
console.log( '═══════════════════════════════════════════════════════════════════' )
console.log( '  TEST COMPLETE - Multi-Chain Payment Options Work!' )
console.log( '═══════════════════════════════════════════════════════════════════' )
