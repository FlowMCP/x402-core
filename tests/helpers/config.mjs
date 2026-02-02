// --- Contract Catalog ---

const VALID_CONTRACT_CATALOG = {
    'usdc-base': {
        paymentNetworkId: 'eip155:8453',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        domainName: 'USD Coin',
        domainVersion: '2'
    },
    'usdc-avax': {
        paymentNetworkId: 'eip155:43114',
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
        domainName: 'USD Coin',
        domainVersion: '2'
    }
}


// --- Payment Option Catalog ---

const VALID_PAYMENT_OPTION_CATALOG = {
    'option-base-usdc': {
        contractId: 'usdc-base',
        amount: '1000000',
        payTo: '0x1234567890abcdef1234567890abcdef12345678'
    },
    'option-avax-usdc': {
        contractId: 'usdc-avax',
        amount: '2000000',
        payTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    }
}


// --- Server Pay To Address Map ---

const VALID_SERVER_PAY_TO_ADDRESS_MAP = {
    'merchant-wallet': '0x1234567890abcdef1234567890abcdef12345678'
}


// --- Sample Accepts Entry ---

const SAMPLE_ACCEPTS_ENTRY = {
    scheme: 'exact',
    network: 'eip155:8453',
    amount: '1000000',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: '0x1234567890abcdef1234567890abcdef12345678',
    maxTimeoutSeconds: 300,
    extra: {
        name: 'USDC',
        version: '2'
    }
}


// --- Sample Payment Payload ---

const SAMPLE_PAYMENT_PAYLOAD = {
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:8453',
    payload: {
        signature: '0xdeadbeef',
        authorization: {
            from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            to: '0x1234567890abcdef1234567890abcdef12345678',
            value: '1000000',
            validAfter: '0',
            validBefore: '9999999999',
            nonce: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
    }
}


// --- Sample Settlement Response ---

const SAMPLE_SETTLEMENT = {
    success: true,
    network: 'eip155:8453',
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    payer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}


export {
    VALID_CONTRACT_CATALOG,
    VALID_PAYMENT_OPTION_CATALOG,
    VALID_SERVER_PAY_TO_ADDRESS_MAP,
    SAMPLE_ACCEPTS_ENTRY,
    SAMPLE_PAYMENT_PAYLOAD,
    SAMPLE_SETTLEMENT
}
