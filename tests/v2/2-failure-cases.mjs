import { ClientExact, ServerExact, NonceStore } from '../../src/v2/exact/evm/index.mjs'
import { PaymentHeaders } from '../../src/v2/transports/http/paymentHeaders.mjs'
import { ConfigValidator } from '../../src/v2/config/index.mjs'
import { EnvironmentManager } from './helpers/EnvironmentManager.mjs'


const cfg = {
    'server': {
        '84532': {
            'envSelection': [
                [ 'facilitatorPrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
                [ 'payTo1',                'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY'  ],
                [ 'serverProviderUrl',     'BASE_SEPOLIA_ALCHEMY_HTTP'        ]
            ],
            'acceptedPaymentOptionIdList': [
                'usdc-001'
            ],
            'paymentOptionCatalog': {
                'usdc-001': {
                    'contractId': 'usdc-base-sepolia',
                    'amount': '10000',
                    'payTo': '{{payTo1}}',
                    'maxTimeoutSeconds': 300,
                    'assetTransferMethod': 'transferWithAuthorization'
                }
            },
            'contractCatalog': {
                'usdc-base-sepolia': {
                    'paymentNetworkId': 'eip155:84532',
                    'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    'decimals': 6,
                    'domainName': 'USDC',
                    'domainVersion': '2'
                }
            }
        }
    },
    'client': {
        '84532': {
            'envSelection': [
                [ 'clientPrivateKey',  'ACCOUNT_DEVELOPMENT_PRIVATE_KEY' ],
                [ 'clientProviderUrl', 'BASE_SEPOLIA_ALCHEMY_HTTP'       ]
            ],
            'clientSupportedPaymentNetworkIdList': [
                'eip155:84532'
            ],
            'clientAllowedAssetConstraintList': [
                {
                    'asset': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    'maxAmount': '1000000'
                }
            ]
        }
    }
}
const chainId = '84532'
const envPath = './../../../../../.env'
const monetizedResourceDescriptor = 'https://api.example.com/resource/failure-test'

let testsPassed = 0
let testsFailed = 0


async function runTest( testName, testFn ) {
    try {
        await testFn()
        console.log( `✅ PASS: ${testName}` )
        testsPassed++
    } catch( e ) {
        console.log( `❌ FAIL: ${testName}` )
        console.log( `   Error: ${e.message}` )
        if( e.issues ) {
            console.log( `   Issues: ${JSON.stringify( e.issues, null, 2 )}` )
        }
        testsFailed++
    }
}


// Setup shared resources
const { credentials: clientCredentials, privateKey: clientPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: cfg[ 'client' ][ chainId ][ 'envSelection' ] } )
const { credentials: serverCredentials, privateKey: serverPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: cfg[ 'server' ][ chainId ][ 'envSelection' ] } )

const { contractCatalog, paymentOptionCatalog, acceptedPaymentOptionIdList } = cfg[ 'server' ][ chainId ]
const serverPayToAddressMap = { 'payTo1': serverCredentials.payTo1 }

const { preparedPaymentOptionCatalog } = ServerExact
    .getPreparedPaymentOptionCatalog( { paymentOptionCatalog, serverPayToAddressMap, serverDefaultMaxTimeoutSeconds: 300, contractCatalog } )
const { paymentRequiredResponsePayload } = ServerExact
    .getPaymentRequiredResponsePayload( { monetizedResourceDescriptor, acceptedPaymentOptionIdList, preparedPaymentOptionCatalog, contractCatalog } )


console.log( '\n=== X402 v2 Failure Case Tests ===\n' )


// Test 1: Invalid Signature
await runTest( 'Invalid Signature Detection', async () => {
    const { clientSupportedPaymentNetworkIdList, clientAllowedAssetConstraintList } = cfg[ 'client' ][ chainId ]
    const { clientProviderUrl } = clientCredentials
    const { serverProviderUrl } = serverCredentials

    const client = new ClientExact( { silent: true } )
        .init( { providerUrl: clientProviderUrl } )
    await client
        .setWallet( { privateKey: clientPrivateKey } )

    const { paymentRequiredHeaderValue } = PaymentHeaders
        .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload } )
    const { decodedPaymentRequiredResponsePayload } = client
        .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

    const { selectedPaymentRequirements } = ClientExact
        .selectMatchingPaymentOption( { paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy: null } )

    const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
        .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 } } )

    // Tamper with signature (change last byte)
    const tamperedSignature = exactEvmAuthorizationSignature.slice( 0, -2 ) + 'ff'

    const { paymentPayload } = ClientExact
        .createPaymentPayloadObject( { resource: decodedPaymentRequiredResponsePayload.resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature: tamperedSignature } )

    const { paymentSignatureHeaderValue } = client
        .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )

    const nonceStore = new NonceStore()
    const server = new ServerExact( { nonceStore, silent: true } )
        .init( { providerUrl: serverProviderUrl } )
    await server
        .setWallet( { privateKey: serverPrivateKey } )

    const { decodedPaymentSignatureRequestPayload } = server
        .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

    const { paymentSignatureRequestPayloadValidationOutcome } = await server
        .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

    if( paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
        throw new Error( 'Should have detected invalid signature' )
    }

    const hasSignatureError = paymentSignatureRequestPayloadValidationOutcome.validationIssueList
        .some( ( issue ) => issue.issuePath === 'payload.signature' )

    if( !hasSignatureError ) {
        throw new Error( 'Should have signature-related error' )
    }
} )


// Test 2: Expired Authorization
await runTest( 'Expired Authorization Detection', async () => {
    const { clientSupportedPaymentNetworkIdList, clientAllowedAssetConstraintList } = cfg[ 'client' ][ chainId ]
    const { clientProviderUrl } = clientCredentials
    const { serverProviderUrl } = serverCredentials

    const client = new ClientExact( { silent: true } )
        .init( { providerUrl: clientProviderUrl } )
    await client
        .setWallet( { privateKey: clientPrivateKey } )

    const { paymentRequiredHeaderValue } = PaymentHeaders
        .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload } )
    const { decodedPaymentRequiredResponsePayload } = client
        .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

    const { selectedPaymentRequirements } = ClientExact
        .selectMatchingPaymentOption( { paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy: null } )

    // Create authorization that expired 1 hour ago
    const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
        .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -7200, validBeforeOffsetSeconds: -3600 } } )

    const { paymentPayload } = ClientExact
        .createPaymentPayloadObject( { resource: decodedPaymentRequiredResponsePayload.resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )

    const { paymentSignatureHeaderValue } = client
        .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )

    const nonceStore = new NonceStore()
    const server = new ServerExact( { nonceStore, silent: true } )
        .init( { providerUrl: serverProviderUrl } )
    await server
        .setWallet( { privateKey: serverPrivateKey } )

    const { decodedPaymentSignatureRequestPayload } = server
        .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

    const { paymentSignatureRequestPayloadValidationOutcome } = await server
        .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

    if( paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
        throw new Error( 'Should have detected expired authorization' )
    }

    const hasTimeoutError = paymentSignatureRequestPayloadValidationOutcome.validationIssueList
        .some( ( issue ) => issue.issueCode === 'invalid_exact_evm_payload_timeout' )

    if( !hasTimeoutError ) {
        throw new Error( 'Should have timeout-related error' )
    }
} )


// Test 3: Nonce Replay Detection
await runTest( 'Nonce Replay Detection', async () => {
    const { clientSupportedPaymentNetworkIdList, clientAllowedAssetConstraintList } = cfg[ 'client' ][ chainId ]
    const { clientProviderUrl } = clientCredentials
    const { serverProviderUrl } = serverCredentials

    const client = new ClientExact( { silent: true } )
        .init( { providerUrl: clientProviderUrl } )
    await client
        .setWallet( { privateKey: clientPrivateKey } )

    const { paymentRequiredHeaderValue } = PaymentHeaders
        .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload } )
    const { decodedPaymentRequiredResponsePayload } = client
        .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

    const { selectedPaymentRequirements } = ClientExact
        .selectMatchingPaymentOption( { paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy: null } )

    const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
        .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 } } )

    const { paymentPayload } = ClientExact
        .createPaymentPayloadObject( { resource: decodedPaymentRequiredResponsePayload.resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )

    const { paymentSignatureHeaderValue } = client
        .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )

    // Use same nonce store for both validations to detect replay
    const nonceStore = new NonceStore()
    const server = new ServerExact( { nonceStore, silent: true } )
        .init( { providerUrl: serverProviderUrl } )
    await server
        .setWallet( { privateKey: serverPrivateKey } )

    const { decodedPaymentSignatureRequestPayload } = server
        .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

    // First validation should pass
    const { paymentSignatureRequestPayloadValidationOutcome: firstOutcome } = await server
        .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

    if( !firstOutcome.validationOk ) {
        throw new Error( 'First validation should pass' )
    }

    // Manually mark nonce as used (simulating successful settlement)
    const { authorization } = decodedPaymentSignatureRequestPayload.payload
    const nonceKey = `${authorization.from.toLowerCase()}-${authorization.nonce.toLowerCase()}`
    nonceStore.markUsed( { nonceKey } )

    // Second validation should fail due to nonce replay
    const { paymentSignatureRequestPayloadValidationOutcome: secondOutcome } = await server
        .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

    if( secondOutcome.validationOk ) {
        throw new Error( 'Should have detected nonce replay' )
    }

    const hasNonceError = secondOutcome.validationIssueList
        .some( ( issue ) => issue.issueCode === 'invalid_exact_evm_payload_nonce' )

    if( !hasNonceError ) {
        throw new Error( 'Should have nonce-related error' )
    }
} )


// Test 4: Insufficient Payment Amount
await runTest( 'Insufficient Payment Amount Detection', async () => {
    const { clientSupportedPaymentNetworkIdList, clientAllowedAssetConstraintList } = cfg[ 'client' ][ chainId ]
    const { clientProviderUrl } = clientCredentials
    const { serverProviderUrl } = serverCredentials

    const client = new ClientExact( { silent: true } )
        .init( { providerUrl: clientProviderUrl } )
    await client
        .setWallet( { privateKey: clientPrivateKey } )

    const { paymentRequiredHeaderValue } = PaymentHeaders
        .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload } )
    const { decodedPaymentRequiredResponsePayload } = client
        .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

    const { selectedPaymentRequirements } = ClientExact
        .selectMatchingPaymentOption( { paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy: null } )

    // Modify selected requirements to use lower amount
    const modifiedRequirements = { ...selectedPaymentRequirements, amount: '1' }

    const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
        .createAuthorization( { selectedPaymentRequirements: modifiedRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 } } )

    const { paymentPayload } = ClientExact
        .createPaymentPayloadObject( { resource: decodedPaymentRequiredResponsePayload.resource, selectedPaymentRequirements: modifiedRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )

    const { paymentSignatureHeaderValue } = client
        .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )

    const nonceStore = new NonceStore()
    const server = new ServerExact( { nonceStore, silent: true } )
        .init( { providerUrl: serverProviderUrl } )
    await server
        .setWallet( { privateKey: serverPrivateKey } )

    const { decodedPaymentSignatureRequestPayload } = server
        .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

    const { paymentSignatureRequestPayloadValidationOutcome } = await server
        .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

    if( paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
        throw new Error( 'Should have detected insufficient amount' )
    }

    const hasAmountError = paymentSignatureRequestPayloadValidationOutcome.validationIssueList
        .some( ( issue ) => issue.issueCode === 'invalid_exact_evm_payload_value' )

    if( !hasAmountError ) {
        throw new Error( 'Should have amount-related error' )
    }
} )


// Test 5: Resource Mismatch
await runTest( 'Resource Mismatch Detection', async () => {
    const { clientSupportedPaymentNetworkIdList, clientAllowedAssetConstraintList } = cfg[ 'client' ][ chainId ]
    const { clientProviderUrl } = clientCredentials
    const { serverProviderUrl } = serverCredentials

    const client = new ClientExact( { silent: true } )
        .init( { providerUrl: clientProviderUrl } )
    await client
        .setWallet( { privateKey: clientPrivateKey } )

    const { paymentRequiredHeaderValue } = PaymentHeaders
        .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload } )
    const { decodedPaymentRequiredResponsePayload } = client
        .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

    const { selectedPaymentRequirements } = ClientExact
        .selectMatchingPaymentOption( { paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy: null } )

    const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
        .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 } } )

    // Create payment payload with wrong resource
    const { paymentPayload } = ClientExact
        .createPaymentPayloadObject( { resource: 'https://wrong.resource.com/hacked', selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )

    const { paymentSignatureHeaderValue } = client
        .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )

    const nonceStore = new NonceStore()
    const server = new ServerExact( { nonceStore, silent: true } )
        .init( { providerUrl: serverProviderUrl } )
    await server
        .setWallet( { privateKey: serverPrivateKey } )

    const { decodedPaymentSignatureRequestPayload } = server
        .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

    const { paymentSignatureRequestPayloadValidationOutcome } = await server
        .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )

    if( paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
        throw new Error( 'Should have detected resource mismatch' )
    }

    const hasResourceError = paymentSignatureRequestPayloadValidationOutcome.validationIssueList
        .some( ( issue ) => issue.issuePath === 'resource' )

    if( !hasResourceError ) {
        throw new Error( 'Should have resource-related error' )
    }
} )


// Summary
console.log( '\n=== Test Summary ===' )
console.log( `Passed: ${testsPassed}` )
console.log( `Failed: ${testsFailed}` )
console.log( `Total:  ${testsPassed + testsFailed}` )

if( testsFailed > 0 ) {
    process.exit( 1 )
}
