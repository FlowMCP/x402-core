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
const monetizedResourceDescriptor = 'https://api.example.com/resource/123'

// 1️⃣ Prepare Environment
const { credentials: clientCredentials, privateKey: clientPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: cfg[ 'client' ][ chainId ][ 'envSelection' ] } )
const { credentials: serverCredentials, privateKey: serverPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: cfg[ 'server' ][ chainId ][ 'envSelection' ] } )
console.log( 'Server credentials:', serverCredentials )
console.log( 'Client credentials:', clientCredentials )

// 2️⃣ Validate Configuration
const { contractCatalog, paymentOptionCatalog, acceptedPaymentOptionIdList } = cfg[ 'server' ][ chainId ]
const serverPayToAddressMap = { 'payTo1': serverCredentials.payTo1 }

const { configurationValidationOk, configurationValidationIssueList } = ConfigValidator
    .validateX402V2ExactEvmConfiguration( { contractCatalog, paymentOptionCatalog, serverPayToAddressMap } )
if( !configurationValidationOk ) {
    console.error( 'Configuration validation failed:', configurationValidationIssueList )
    process.exit( 1 )
}
console.log( 'Configuration validation: passed' )

// 3️⃣ Server: Build PaymentRequired
const { preparedPaymentOptionCatalog } = ServerExact
    .getPreparedPaymentOptionCatalog( { paymentOptionCatalog, serverPayToAddressMap, serverDefaultMaxTimeoutSeconds: 300, contractCatalog } )
const { paymentRequiredResponsePayload } = ServerExact
    .getPaymentRequiredResponsePayload( { monetizedResourceDescriptor, acceptedPaymentOptionIdList, preparedPaymentOptionCatalog, contractCatalog } )
const { paymentRequiredHeaderValue } = PaymentHeaders
    .encodePaymentRequiredHeaderValue( { paymentRequiredResponsePayloadToEncode: paymentRequiredResponsePayload } )
console.log( 'PaymentRequired accepts:', paymentRequiredResponsePayload.accepts.length, 'option(s)' )

// 4️⃣ Client: Decode + Validate + Select
const { clientSupportedPaymentNetworkIdList, clientAllowedAssetConstraintList } = cfg[ 'client' ][ chainId ]
const { clientProviderUrl } = clientCredentials

const client = new ClientExact( { silent: false } )
    .init( { providerUrl: clientProviderUrl } )
await client
    .setWallet( { privateKey: clientPrivateKey } )

const { decodedPaymentRequiredResponsePayload } = client
    .decodePaymentRequiredHeader( { paymentRequiredHeaderValueToDecode: paymentRequiredHeaderValue } )

const { paymentRequiredResponsePayloadValidationOutcome } = ClientExact
    .validatePaymentRequiredResponsePayload( { paymentRequiredResponsePayloadToValidate: decodedPaymentRequiredResponsePayload } )
if( !paymentRequiredResponsePayloadValidationOutcome.validationOk ) {
    console.error( 'PaymentRequired validation failed:', paymentRequiredResponsePayloadValidationOutcome.validationIssueList )
    process.exit( 1 )
}

const { selectedPaymentRequirements, paymentOptionSelectionDiagnostics } = ClientExact
    .selectMatchingPaymentOption( { paymentRequiredResponsePayload: decodedPaymentRequiredResponsePayload, clientAllowedAssetConstraintList, clientSupportedPaymentNetworkIdList, paymentOptionSelectionPolicy: null } )
if( !selectedPaymentRequirements ) {
    console.error( 'No matching payment option found:', paymentOptionSelectionDiagnostics )
    process.exit( 1 )
}
console.log( 'Selected payment option:', selectedPaymentRequirements.network, selectedPaymentRequirements.amount )

// 5️⃣ Client: Create Authorization + PaymentPayload
const { exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } = await client
    .createAuthorization( { selectedPaymentRequirements, exactEvmAuthorizationTimeWindowDefinition: { validAfterOffsetSeconds: -30 } } )

const { paymentPayload } = ClientExact
    .createPaymentPayloadObject( { resource: decodedPaymentRequiredResponsePayload.resource, selectedPaymentRequirements, exactEvmAuthorizationPayload, exactEvmAuthorizationSignature } )

const { paymentSignatureHeaderValue } = client
    .createPaymentSignatureHeader( { paymentSignatureRequestPayloadToEncode: paymentPayload } )
console.log( 'Authorization nonce:', exactEvmAuthorizationPayload.nonce.slice( 0, 20 ) + '...' )

// 6️⃣ Server: Decode + Validate + Simulate + Settle
const { serverProviderUrl } = serverCredentials
const nonceStore = new NonceStore()
const server = new ServerExact( { nonceStore, silent: false } )
    .init( { providerUrl: serverProviderUrl } )
await server
    .setWallet( { privateKey: serverPrivateKey } )

const { decodedPaymentSignatureRequestPayload } = server
    .decodePaymentSignatureHeader( { paymentSignatureHeaderValueToDecode: paymentSignatureHeaderValue } )

const { paymentSignatureRequestPayloadValidationOutcome } = await server
    .validatePaymentSignatureRequestPayload( { decodedPaymentSignatureRequestPayloadToValidate: decodedPaymentSignatureRequestPayload, paymentRequiredResponsePayload } )
if( !paymentSignatureRequestPayloadValidationOutcome.validationOk ) {
    console.error( 'Payment validation failed:', paymentSignatureRequestPayloadValidationOutcome.validationIssueList )
    process.exit( 1 )
}
const { matchedPaymentRequirementsFromClientPayload } = paymentSignatureRequestPayloadValidationOutcome

const { paymentSimulationOutcome } = await server
    .simulateTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } )
if( !paymentSimulationOutcome.simulationOk ) {
    console.error( 'Simulation failed:', paymentSimulationOutcome.simulationError )
    process.exit( 1 )
}

const { paymentSettlementOutcome } = await server
    .settleTransaction( { decodedPaymentSignatureRequestPayload, matchedPaymentRequirementsFromClientPayload } )
if( !paymentSettlementOutcome.settlementOk ) {
    console.error( 'Settlement failed:', paymentSettlementOutcome.settlementError )
    process.exit( 1 )
}
const { settlementResponse } = paymentSettlementOutcome

// 7️⃣ Server: Create PAYMENT-RESPONSE Header
const { paymentResponseHeaderValue } = server
    .createPaymentResponseHeader( { paymentResponseSettlementPayload: settlementResponse } )

console.log( '' )
console.log( 'Settlement successful!' )
console.log( '  Transaction:', settlementResponse.transaction )
console.log( '  Network:', settlementResponse.network )
console.log( '  Payer:', settlementResponse.payer )
