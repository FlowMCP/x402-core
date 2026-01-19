// v2 E2E Test Template
// This test mirrors the v1 E2E flow but uses v2 imports.
// Currently gated - v2 is not yet implemented.

const X402_V2_ENABLED = process.env.X402_V2 === '1'

if( !X402_V2_ENABLED ) {
    console.log( '⏭️  Skipping v2 E2E test - v2 not yet implemented.' )
    console.log( '   Set X402_V2=1 to run this test when v2 is ready.' )
    process.exit( 0 )
}

import { ClientExact, ServerExact } from '../../src/v2/exact/evm/index.mjs'
import { EnvironmentManager } from '../v1/helpers/EnvironmentManager.mjs'


const cfg = {
    'server': {
        '84532': {
            'chainName': 'base-sepolia',
            'envSelection': [
                [ 'facilitatorBasePrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
                [ 'payTo1',                    'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY'  ],
                [ 'serverProviderUrl',         'BASE_SEPOLIA_ALCHEMY_HTTP'        ]
            ],
            'activePaymentOptions': [
                'usdc-sepolia'
            ],
            'paymentOptions': {
                'usdc-sepolia': {
                    'contractId': 'usdc-sepolia',
                    'maxAmountRequired': '0.01',
                    'payTo': '{{payTo1}}',
                }
            },
            'contracts': {
                'usdc-sepolia': {
                    'domainName': 'USDC',
                    'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    'assetType': 'erc20',
                    'decimals': 6
                }
            }
        }
    },
    'client': {
        '84532': {
            'chainName': 'base-sepolia',
            'envSelection': [
                [ 'clientPrivateKey',          'ACCOUNT_DEVELOPMENT_PRIVATE_KEY' ],
                [ 'clientProviderUrl',         'BASE_SEPOLIA_ALCHEMY_HTTP' ]
            ],
            'allowedPaymentOptions': [
                {
                    'name': 'USDC',
                    'tokenAddress': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    'decimals': 6,
                    'maxAmountRequired': '0.01'
                }
            ]
        }
    }
}
const chainId = '84532'
const envPath = './../../../.env'

// 1️⃣ Prepare Environment
const { x402Credentials: clientCredentials, privateKey: clientPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: cfg['client'][ chainId ]['envSelection'] } )
const { x402Credentials: serverCredentials, privateKey: serverPrivateKey } = EnvironmentManager
    .getCredentials( { envPath, envSelection: cfg['server'][ chainId ]['envSelection'] } )
console.log( 'Server credentials:', serverCredentials )
console.log( 'client credentials:', clientCredentials )

// 2️⃣ Server static paymentRequirementsPayload
const { chainName, contracts, paymentOptions, activePaymentOptions } = cfg['server'][ chainId ]
const { preparedPaymentOptions } = ServerExact
    .getPreparedPaymentOptions( { paymentOptions, activePaymentOptions, serverCredentials } )
const { paymentRequirementsPayload } = ServerExact
    .getPaymentRequirementsPayload( { chainId, chainName, preparedPaymentOptions, contracts, resource: '' } )

// 3️⃣ Client initialize
const { allowedPaymentOptions } = cfg['client'][ chainId ]
const { paymentOption } = ClientExact
    .selectMatchingPaymentOption( { paymentRequirementsPayload, allowedPaymentOptions, chainId } )

const { scheme, network } = paymentOption
const { clientProviderUrl } = clientCredentials
const { extra: { domain: { verifyingContract } } } = paymentOption

const client = new ClientExact( { silent: false } )
    .init( { providerUrl: clientProviderUrl } )
await client
    .setWallet( { privateKey: clientPrivateKey, allowedPaymentOptions } )

const { authorization, signature } = await client
    .createAuthorization( { paymentOption, allowedPaymentOptions, chainId } )
const { headerString } = client
    .createXPaymentHeader( { scheme, network, authorization, signature } )

// 4️⃣ Server decode payment header
const { serverProviderUrl } = serverCredentials
const server = new ServerExact( { silent: false } )
    .init( { providerUrl: serverProviderUrl } )
await server
    .setWallet( { privateKey: serverPrivateKey } )

const receivedHeaderString = headerString
const { decodedPayment } = server
    .decodePaymentHeader( { headerString: receivedHeaderString } )
const { selectedRequirement } = server
    .findMatchingPaymentRequirements( { paymentRequirementsPayload, decodedPayment } )
if( !selectedRequirement ) {
    console.error( 'No matching payment requirement found' )
    process.exit( 1 )
}

const validationResult = await server
    .validatePayment( { decodedPayment, paymentRequirement: selectedRequirement } )
if( !validationResult.ok ) {
    console.error( 'Payment validation failed:', validationResult.error )
    process.exit( 1 )
}

const simulationResult = await server
    .simulateTransaction( { decodedPayment, tokenAddress: verifyingContract } )
if( !simulationResult.ok ) {
    console.error( 'Simulation failed:', simulationResult.error )
    process.exit( 1 )
}

const settlementResult = await server
    .settleTransaction( { decodedPayment, tokenAddress: verifyingContract } )
if( !settlementResult.ok ) {
    console.error( 'Settlement failed' )
    process.exit( 1 )
}
