import { createPublicClient, createWalletClient, http, parseUnits, parseAbi, encodeFunctionData, getContract, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { randomBytes } from 'crypto'


function logTable(title, rows) {
    console.log(`\n===== ${title} =====`)
    for (const [key, value] of Object.entries(rows)) {
        console.log(`${key.padEnd(20)}: ${value}`)
    }
    console.log('===========================\n')
}


class ClientExact {
    #provider
    #abi
    #clientSigner
    #silent

    constructor( { silent = false } ) {
        this.#silent = silent
    }


    static selectMatchingPaymentOption( { paymentRequirementsPayload, allowedPaymentOptions, chainId } ) {
        const allowedList = allowedPaymentOptions
            .map( ( { tokenAddress, maxAmountRequired } ) => ( {
                tokenAddress: tokenAddress.toLowerCase(),
                maxAmountRequired: parseFloat( maxAmountRequired )
            } ) )

        const match = paymentRequirementsPayload['accepts']
            .filter( ( { scheme } ) => scheme === 'exact' )
            .find( ( paymentOption ) => {
                const verifyingContract = paymentOption.extra.domain.verifyingContract.toLowerCase()
                const serverChainId = paymentOption.extra.domain.chainId
                const serverAmount = parseFloat( paymentOption.maxAmountRequired )

                if( serverChainId.toString() !== chainId.toString() ) {
                    return false
                }

                const isMatch = allowedList
                    .some( ( { tokenAddress, maxAmountRequired } ) => 
                        tokenAddress === verifyingContract && maxAmountRequired <= serverAmount
                    )

                return isMatch
            } )

        if( !match ) {
            throw new Error( 'No matching payment option found for client' )
        }

        return { paymentOption: match }
    }


    init( { providerUrl } ) {
        const provider = createPublicClient( { transport: http( providerUrl ) } )
        this.#provider = provider

        this.#abi = parseAbi( [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
        ] )

        this.#log( '✅ Client initialized' )
        return this
    }


    async setWallet( { privateKey, allowedPaymentOptions } ) {
        const cleanHex = privateKey.startsWith( '0x' ) ? privateKey : `0x${ privateKey }`
        this.#clientSigner = privateKeyToAccount( cleanHex )
        const accountAddress = this.#clientSigner.address

        const balances = []

        for ( const option of allowedPaymentOptions ) {
            const tokenAddress = option.tokenAddress
            const usdcContract = getContract( {
                address: tokenAddress,
                abi: this.#abi,
                client: this.#provider
            } )

            let balanceRaw
            let decimals

            try {
                [ balanceRaw, decimals ] = await Promise.all( [
                    usdcContract.read.balanceOf( [ accountAddress ] ),
                    usdcContract.read.decimals()
                ] )
            } catch( err ) {
                console.warn( `⚠ Failed to read token ${ tokenAddress }:`, err )

                continue
            }

            const balance = Number( formatUnits( balanceRaw, decimals ) )

            balances.push( {
                name: option.name,
                tokenAddress,
                decimals,
                balance,
                minRequired: parseFloat( option.maxAmountRequired ),
                paymentCapacity: Math.floor( balance / parseFloat( option.maxAmountRequired ) )
            } )
        }

        if( !this.#silent ) {
            balances
                .forEach( ( entry ) => {
                    const sufficient = entry.balance >= entry.minRequired ? '✅ Sufficient' : '⚠ Insufficient'
                    logTable( `Wallet Balance for ${ entry.name }`, {
                        'Token Address': entry.tokenAddress,
                        'Balance': `${ entry.balance } (${ entry.decimals } decimals)` ,
                        'Min Required': `${ entry.minRequired }`,
                        'Capacity': `${ entry.paymentCapacity } payments possible`,
                        'Status': sufficient
                    } )
                } )
        }

        balances
            .forEach( ( entry ) => {
                if( entry.balance < entry.minRequired ) {
                    console.warn( `⚠ Balance of ${ entry.name } below required threshold: ${ entry.balance } < ${ entry.minRequired }` )
                }
            } )

        return this
    }


    async createAuthorization( { paymentOption, allowedPaymentOptions, chainId } ) {
        const { extra, payTo, maxAmountRequired, maxTimeoutSeconds } = paymentOption
        const { domain } = extra
        const { verifyingContract, chainId: domainChainId } = domain

        const from = this.#clientSigner.address
        const to = payTo

        const allowed = allowedPaymentOptions
            .find( ( option ) => option.tokenAddress.toLowerCase() === domain.verifyingContract.toLowerCase() )

        if( !allowed ) {
            throw new Error( `Token ${ domain.verifyingContract } not allowed for client` )
        }

        if( domainChainId.toString() !== chainId.toString() ) {
            throw new Error( `ChainId mismatch: expected ${ chainId }, but got ${ domainChainId }` )
        }

        const decimals = allowed.decimals
        const value = parseUnits( maxAmountRequired.toString(), decimals )
        const validAfter = BigInt( Math.floor( Date.now() / 1000 ) - 30 )
        const validBefore = validAfter + BigInt( maxTimeoutSeconds || 60 )

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

        return { authorization, signature }
    }


    createXPaymentHeader( { scheme, network, authorization, signature } ) {
        const safeAuthorization = {
            ...authorization,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString()
        }

        const headerString = JSON.stringify( { x402Version: 1, scheme, network, payload: { signature, authorization: safeAuthorization } } )
        this.#log( '✅ X-PAYMENT Header generated' )
        return { headerString }
    }


    #log( message ) {
        if( !this.#silent ) {
            console.log( message )
        }
    }
}


export { ClientExact }
