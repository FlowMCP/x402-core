import {  ClientExact,  ServerExact,  NonceStore  } from './../src/index.mjs'
import { EnvironmentManager } from './../tests/helpers/EnvironmentManager.mjs'


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
const envPath = './../../.env'

// 1️⃣ Prepare Environment
const serverCredentials = {
  payTo1: '0xxyz',
  serverProviderUrl: 'https://...'
}
const clientCredentials = {
  clientProviderUrl: 'https://...'
}


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