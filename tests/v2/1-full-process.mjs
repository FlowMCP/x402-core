// X402 v2 E2E Test - Full Process
// Tests the complete payment flow: Server -> Client -> Server -> Settlement

import { ClientExact, ServerExact, NonceStore } from '../../src/v2/exact/evm/index.mjs'
import { PaymentHeaders } from '../../src/v2/transports/http/paymentHeaders.mjs'
import { ConfigValidator } from '../../src/v2/config/index.mjs'
import { EnvironmentManager } from './helpers/EnvironmentManager.mjs'


// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const envPath = './../../../.env'
const chainId = '84532'
const paymentNetworkId = `eip155:${chainId}`

const serverEnvSelection = [
    [ 'facilitatorPrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
    [ 'payTo1', 'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY' ],
    [ 'serverProviderUrl', 'BASE_SEPOLIA_ALCHEMY_HTTP' ]
]

const clientEnvSelection = [
    [ 'clientPrivateKey', 'ACCOUNT_DEVELOPMENT_PRIVATE_KEY' ],
    [ 'clientProviderUrl', 'BASE_SEPOLIA_ALCHEMY_HTTP' ]
]

// Contract Catalog - defines token contracts
const contractCatalog = {
    'usdc-base-sepolia': {
        paymentNetworkId,
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        decimals: 6,
        domainName: 'USDC',
        domainVersion: '2'
    }
}

// Payment Option Catalog - defines payment options referencing contracts
const paymentOptionCatalog = {
    'usdc-001': {
        contractId: 'usdc-base-sepolia',
        amount: '10000',
        payTo: '{{payTo1}}',
        maxTimeoutSeconds: 300,
        assetTransferMethod: 'transferWithAuthorization'
    }
}

// Monetized Resource
const monetizedResourceDescriptor = 'https://api.example.com/resource/123'

// Accepted payment options for this endpoint
const acceptedPaymentOptionIdList = [ 'usdc-001' ]


// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

const logSection = ( title ) => {
    console.log( '' )
    console.log( `${'═'.repeat( 60 )}` )
    console.log( `  ${title}` )
    console.log( `${'═'.repeat( 60 )}` )
}

const logStep = ( step, message ) => {
    console.log( `\n${step} ${message}` )
}

const logResult = ( label, value ) => {
    console.log( `   ${label}: ${typeof value === 'object' ? JSON.stringify( value, null, 2 ).split( '\n' ).join( '\n   ' ) : value}` )
}


// ═══════════════════════════════════════════════════════════════════════════
// Main Test
// ═══════════════════════════════════════════════════════════════════════════

const runFullProcessTest = async () => {
    logSection( 'X402 v2 E2E Test - Full Process' )

    // ─────────────────────────────────────────────────────────────────────────
    // 1️⃣ Load Environment
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '1️⃣', 'Loading Environment' )

    const { credentials: serverCredentials, privateKey: serverPrivateKey } = EnvironmentManager
        .getCredentials( { envPath, envSelection: serverEnvSelection } )
    const { credentials: clientCredentials, privateKey: clientPrivateKey } = EnvironmentManager
        .getCredentials( { envPath, envSelection: clientEnvSelection } )

    logResult( 'Server payTo1', serverCredentials.payTo1 )
    logResult( 'Client Provider', clientCredentials.clientProviderUrl ? '✓ loaded' : '✗ missing' )

    // ─────────────────────────────────────────────────────────────────────────
    // 2️⃣ Validate Configuration
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '2️⃣', 'Validating Configuration' )

    const serverPayToAddressMap = {
        'payTo1': serverCredentials.payTo1
    }

    const { configurationValidationOk, configurationValidationIssueList } = ConfigValidator
        .validateX402V2ExactEvmConfiguration( {
            contractCatalog,
            paymentOptionCatalog,
            serverPayToAddressMap
        } )

    if( !configurationValidationOk ) {
        console.error( '❌ Configuration validation failed:' )
        configurationValidationIssueList
            .forEach( ( issue ) => {
                console.error( `   - ${issue.issuePath}: ${issue.issueMessage}` )
            } )
        process.exit( 1 )
    }

    logResult( 'Config Validation', '✓ passed' )

    // ─────────────────────────────────────────────────────────────────────────
    // 3️⃣ Server: Build PaymentRequired Response
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '3️⃣', 'Server: Building PaymentRequired Response' )

    const { preparedPaymentOptionCatalog } = ServerExact
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog,
            serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExact
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor,
            acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog
        } )

    logResult( 'PaymentRequired accepts', paymentRequiredResponsePayload.accepts.length + ' option(s)' )
    logResult( 'First accept', {
        scheme: paymentRequiredResponsePayload.accepts[ 0 ].scheme,
        network: paymentRequiredResponsePayload.accepts[ 0 ].network,
        amount: paymentRequiredResponsePayload.accepts[ 0 ].amount,
        asset: paymentRequiredResponsePayload.accepts[ 0 ].asset.slice( 0, 10 ) + '...'
    } )

    // Encode PAYMENT-REQUIRED header
    const { paymentRequiredHeaderValue } = PaymentHeaders
        .encodePaymentRequiredHeaderValue( {
            paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload
        } )

    logResult( 'PAYMENT-REQUIRED header', paymentRequiredHeaderValue.slice( 0, 50 ) + '...' )

    // ─────────────────────────────────────────────────────────────────────────
    // 4️⃣ Client: Decode, Validate, Select, Authorize
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '4️⃣', 'Client: Processing PaymentRequired' )

    // Initialize client
    const client = new ClientExact( { silent: true } )
        .init( { providerUrl: clientCredentials.clientProviderUrl } )
    await client
        .setWallet( { privateKey: clientPrivateKey } )

    // Decode PAYMENT-REQUIRED header
    const { decodedPaymentRequiredResponsePayload } = client
        .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

    logResult( 'Decoded resource', decodedPaymentRequiredResponsePayload.resource )

    // Validate PaymentRequired
    const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
        .validatePaymentRequiredResponsePayload( {
            paymentRequiredResponsePayloadToValidate: decodedPaymentRequiredResponsePayload
        } )

    if( !paymentRequiredResponsePayloadValidationOutcome.validationOk ) {
        console.error( '❌ PaymentRequired validation failed' )
        process.exit( 1 )
    }

    logResult( 'PaymentRequired validation', '✓ passed' )

    // Select matching payment option
    const clientAllowedAssetConstraintList = [
        {
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            maxAmount: '1000000'
        }
    ]
    const clientSupportedPaymentNetworkIdList = [ paymentNetworkId ]

    const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
        .selectMatchingPaymentOption( {
            paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload,
            clientAllowedAssetConstraintList,
            clientSupportedPaymentNetworkIdList,
            paymentOptionSelectionPolicy: null
        } )

    if( !selectedPaymentRequirements ) {
        console.error( '❌ No matching payment option found' )
        console.error( '   Diagnostics:', paymentOptionSelectionDiagnostics )
        process.exit( 1 )
    }

    logResult( 'Selected option', {
        network: selectedPaymentRequirements.network,
        amount: selectedPaymentRequirements.amount
    } )
    logResult( 'Selection reason', paymentOptionSelectionDiagnostics.selectionReason )

    // Create EIP-3009 authorization
    const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
        .createAuthorization( {
            selectedPaymentRequirements,
            exactEvmAuthorizationTimeWindowDefinition: {
                validAfterOffsetSeconds: -30,
                validBeforeOffsetSeconds: null
            }
        } )

    logResult( 'Authorization nonce', exactEvmAuthorizationPayload.nonce.slice( 0, 20 ) + '...' )
    logResult( 'Signature', exactEvmAuthorizationSignature.slice( 0, 30 ) + '...' )

    // Create PaymentPayload
    const { paymentPayload } = ClientExact
        .createPaymentPayloadObject( {
            resource: decodedPaymentRequiredResponsePayload.resource,
            selectedPaymentRequirements,
            exactEvmAuthorizationPayload,
            exactEvmAuthorizationSignature
        } )

    // Encode PAYMENT-SIGNATURE header
    const { paymentSignatureHeaderValue } = client
        .createPaymentSignatureHeader( {
            paymentSignatureRequestPayloadToEncode: paymentPayload
        } )

    logResult( 'PAYMENT-SIGNATURE header', paymentSignatureHeaderValue.slice( 0, 50 ) + '...' )

    // ─────────────────────────────────────────────────────────────────────────
    // 5️⃣ Server: Decode, Validate, Simulate, Settle
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '5️⃣', 'Server: Processing Payment' )

    // Initialize server
    const nonceStore = new NonceStore()
    const server = new ServerExact( { nonceStore, silent: true } )
        .init( { providerUrl: serverCredentials.serverProviderUrl } )
    await server
        .setWallet( { privateKey: serverPrivateKey } )

    // Decode PAYMENT-SIGNATURE header
    const { decodedPaymentSignatureRequestPayload } = server
        .decodePaymentSignatureHeader( {
            paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue
        } )

    logResult( 'Decoded payment scheme', decodedPaymentSignatureRequestPayload.accepted.scheme )

    // Validate payment
    const { paymentSignatureRequestPayloadValidationOutcome } = server
        .validatePaymentSignatureRequestPayload( {
            decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload,
            paymentRequiredResponsePayload
        } )

    const { validationOk, validationIssueList, matchedPaymentRequirementsFromClientPayload } = paymentSignatureRequestPayloadValidationOutcome

    if( !validationOk ) {
        console.error( '❌ Payment validation failed:' )
        validationIssueList
            .forEach( ( issue ) => {
                console.error( `   - ${issue.issuePath}: ${issue.issueMessage} (${issue.issueCode})` )
            } )
        process.exit( 1 )
    }

    logResult( 'Payment validation', '✓ passed' )
    logResult( 'Matched requirement', {
        network: matchedPaymentRequirementsFromClientPayload.network,
        amount: matchedPaymentRequirementsFromClientPayload.amount
    } )

    // Simulate transaction
    const { paymentSimulationOutcome } = await server
        .simulateTransaction( {
            decodedPaymentSignatureRequestPayload,
            matchedPaymentRequirementsFromClientPayload
        } )

    if( !paymentSimulationOutcome.simulationOk ) {
        console.error( '❌ Simulation failed:', paymentSimulationOutcome.simulationError )
        process.exit( 1 )
    }

    logResult( 'Simulation', '✓ passed' )

    // Settle transaction
    const { paymentSettlementOutcome } = await server
        .settleTransaction( {
            decodedPaymentSignatureRequestPayload,
            matchedPaymentRequirementsFromClientPayload
        } )

    if( !paymentSettlementOutcome.settlementOk ) {
        console.error( '❌ Settlement failed:', paymentSettlementOutcome.settlementError )
        process.exit( 1 )
    }

    const { settlementResponse } = paymentSettlementOutcome
    logResult( 'Settlement', '✓ success' )
    logResult( 'Transaction hash', settlementResponse.transaction )

    // ─────────────────────────────────────────────────────────────────────────
    // 6️⃣ Server: Create PAYMENT-RESPONSE Header
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '6️⃣', 'Server: Creating Response Header' )

    const { paymentResponseHeaderValue } = server
        .createPaymentResponseHeader( {
            paymentResponseSettlementPayload: settlementResponse
        } )

    logResult( 'PAYMENT-RESPONSE header', paymentResponseHeaderValue.slice( 0, 50 ) + '...' )

    // ─────────────────────────────────────────────────────────────────────────
    // ✅ Success
    // ─────────────────────────────────────────────────────────────────────────
    logSection( 'TEST PASSED ✅' )
    console.log( `\n  Transaction: ${settlementResponse.transaction}` )
    console.log( `  Network: ${settlementResponse.network}` )
    console.log( `  Payer: ${settlementResponse.payer}` )
    console.log( '' )
}


// ═══════════════════════════════════════════════════════════════════════════
// Failure Case Test - Network Not Supported
// ═══════════════════════════════════════════════════════════════════════════

const runFailureCaseNetworkNotSupported = async () => {
    logSection( 'X402 v2 E2E Test - Failure Case: Network Not Supported' )

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '1️⃣', 'Loading Environment' )

    const { credentials: serverCredentials } = EnvironmentManager
        .getCredentials( { envPath, envSelection: serverEnvSelection } )

    const serverPayToAddressMap = { 'payTo1': serverCredentials.payTo1 }

    // ─────────────────────────────────────────────────────────────────────────
    // Server: Build PaymentRequired
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '2️⃣', 'Server: Building PaymentRequired Response' )

    const { preparedPaymentOptionCatalog } = ServerExact
        .getPreparedPaymentOptionCatalog( {
            paymentOptionCatalog,
            serverPayToAddressMap,
            serverDefaultMaxTimeoutSeconds: 300,
            contractCatalog
        } )

    const { paymentRequiredResponsePayload } = ServerExact
        .getPaymentRequiredResponsePayload( {
            monetizedResourceDescriptor,
            acceptedPaymentOptionIdList,
            preparedPaymentOptionCatalog,
            contractCatalog
        } )

    logResult( 'Server network', paymentRequiredResponsePayload.accepts[ 0 ].network )

    // ─────────────────────────────────────────────────────────────────────────
    // Client: Try to select with unsupported network
    // ─────────────────────────────────────────────────────────────────────────
    logStep( '3️⃣', 'Client: Attempting Selection with Unsupported Network' )

    const clientAllowedAssetConstraintList = [
        {
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            maxAmount: '1000000'
        }
    ]

    // Client only supports Ethereum mainnet, not Base Sepolia
    const clientSupportedPaymentNetworkIdList = [ 'eip155:1' ]

    const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
        .selectMatchingPaymentOption( {
            paymentRequiredResponsePayload,
            clientAllowedAssetConstraintList,
            clientSupportedPaymentNetworkIdList,
            paymentOptionSelectionPolicy: null
        } )

    if( selectedPaymentRequirements === null ) {
        logResult( 'Selection result', 'No match (expected)' )
        logResult( 'Diagnostics', paymentOptionSelectionDiagnostics )

        logSection( 'FAILURE CASE TEST PASSED ✅' )
        console.log( '\n  Client correctly rejected unsupported network' )
        console.log( `  Error code: ${paymentOptionSelectionDiagnostics.errorCode}` )
        console.log( '' )

        return true
    }

    console.error( '❌ Expected no match, but got:', selectedPaymentRequirements )

    return false
}


// ═══════════════════════════════════════════════════════════════════════════
// Run Tests
// ═══════════════════════════════════════════════════════════════════════════

const main = async () => {
    try {
        // Run failure case first (no blockchain interaction)
        await runFailureCaseNetworkNotSupported()

        // Run full success case
        await runFullProcessTest()
    } catch( error ) {
        console.error( '\n❌ Test failed with error:' )
        console.error( error.message )
        console.error( error.stack )
        process.exit( 1 )
    }
}

main()
