import { parse } from 'json2csv';
import { createPublicClient, createWalletClient, http, parseUnits, parseAbi, encodeFunctionData, getContract, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'


function logTable(title, rows) {
    console.log(`\n===== ${title} =====`);
    for (const [key, value] of Object.entries(rows)) {
        console.log(`${key.padEnd(20)}: ${value}`);
    }
    console.log('===========================\n');
}


class ServerExact {
    #nonceStore
    #provider
    #walletClient
    #providerUrl
    #abi
    #facilitatorSigner
    #silent

    constructor( { nonceStore, silent = false } ) {
        this.#nonceStore = nonceStore
        this.#silent = silent
    }

    #log( message ) {
        if( !this.#silent ) {
            console.log( message )
        }
    }

    init( { providerUrl } ) {
        this.#providerUrl = providerUrl
        this.#provider = createPublicClient( { transport: http( this.#providerUrl ) } )

        this.#abi = parseAbi( [
            'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
            'function balanceOf(address owner) view returns (uint256)',
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)'
        ] )

        this.#log( '✅ Facilitator initialized' )
        return this
    }

    static getPaymentRequirementsPayload( { chainId, chainName, paymentOptions, contracts, resource='' } ) {
        const accepts = paymentOptions
            .map( ( paymentOption ) => {
                const { contractId, maxAmountRequired, payTo } = paymentOption
                const contract = contracts[ contractId ]
                const { address: verifyingContract, decimals, domainName: name } = contract

                const scheme = 'exact'
                return {
                    scheme,
                    network: chainName,
                    payTo,
                    maxAmountRequired,
                    maxTimeoutSeconds: 300,
                    extra: {
                        domain: {
                            name,
                            version: '2',
                            chainId: parseInt( chainId ),
                            verifyingContract
                        },
                        resource
                    }
                }
            } )

        return { paymentRequirementsPayload: { x402Version: 1, errorCode: '', error: '', accepts } }
    }


    static getPaymentOptions( { cfg, serverCredentials } ) {
        let { paymentOptions } = cfg
        paymentOptions = paymentOptions
            .map( ( option ) => {
                const { payTo } = option
                const searchKey = payTo.replaceAll( '{{', '' ).replaceAll( '}}', '' )
                const payToValue = serverCredentials[ searchKey ]
                if( !payToValue ) {
                    throw new Error( `PayTo value for ${searchKey} not found in serverCredentials` )
                }
                option['payTo'] = payToValue

                return option
            } )

        return { paymentOptions }
    }

    async setWallet( { privateKey, minEth = '0.01' } ) {
        const cleanHex = privateKey.startsWith( '0x' ) ? privateKey : `0x${ privateKey }`
        this.#facilitatorSigner = privateKeyToAccount( cleanHex )
        const accountAddress = this.#facilitatorSigner.address

        this.#walletClient = createWalletClient({
            account: this.#facilitatorSigner,
            transport: http(this.#providerUrl)
        });

        const balanceRaw = await this.#provider.getBalance( { address: accountAddress } )
        const balance = Number( formatUnits( balanceRaw, 18 ) )

        if (!this.#silent) {
            logTable('Facilitator Wallet', {
                'Address': accountAddress,
                'ETH Balance': `${balance} ETH`
            });
        }

        if( balance < parseFloat( minEth ) ) {
            console.warn( '⚠ Facilitator ETH balance below minimum threshold' )
        }

        return this
    }

    decodePaymentHeader( { headerString } ) {
        const decodedPayment = JSON.parse( headerString )
        const authorization = decodedPayment.payload.authorization

        authorization.value = BigInt( authorization.value )
        authorization.validAfter = BigInt( authorization.validAfter )
        authorization.validBefore = BigInt( authorization.validBefore )

        this.#log( '✅ Payment header decoded' )
        return { decodedPayment }
    }

    findMatchingPaymentRequirements( { paymentRequirementsPayload, decodedPayment } ) {
        
        const selectedRequirement = paymentRequirementsPayload['accepts']
            .find( ( pr ) =>
                pr.scheme === decodedPayment.scheme &&
                pr.network === decodedPayment.network &&
                pr.payTo.toLowerCase() === decodedPayment.payload.authorization.to.toLowerCase()
            ) || null

        if( selectedRequirement ) {
            this.#log( '✅ Matching payment requirement found' )
        } else {
            this.#log( '❌ No matching payment requirement found' )
        }

        return { selectedRequirement }
    }

    async validatePayment( { decodedPayment, paymentRequirement } ) {
        const message = decodedPayment.payload.authorization
        const now = BigInt( Math.floor( Date.now() / 1000 ) )

        if( now < message.validAfter || now > message.validBefore ) {
            return { ok: false, error: 'Authorization expired or not yet valid' }
        }

        const nonceKey = `${ message.from.toLowerCase() }-${ message.nonce.toLowerCase() }`
        if( this.#nonceStore.isUsed( { nonceKey } ) ) {
            return { ok: false, error: 'Nonce already used (replay detected)' }
        }

        this.#nonceStore.markUsed( { nonceKey } )
        this.#log( '✅ Payment validated successfully' )
        return { ok: true }
    }

    async simulateTransaction( { decodedPayment, tokenAddress } ) {
        const { authorization: auth, signature } = decodedPayment.payload
        const { from, to, value, validAfter, validBefore, nonce } = auth
        const { v, r, s } = this.#splitVRS( signature )

        const data = encodeFunctionData( {
            abi: this.#abi,
            functionName: 'transferWithAuthorization',
            args: [ from, to, value, validAfter, validBefore, nonce, v, r, s ]
        } )

        try {
            await this.#provider.call( { to: tokenAddress, data } )
            this.#log( '✅ Simulation successful' )
            return { ok: true }
        } catch( e ) {
            this.#log( `❌ Simulation failed: ${ e.message }` )
            return { ok: false, error: e.message }
        }
    }

    async settleTransaction( { decodedPayment, tokenAddress } ) {
        const { authorization: auth, signature } = decodedPayment.payload
        const { from, to, value, validAfter, validBefore, nonce } = auth
        const { v, r, s } = this.#splitVRS( signature )

        const data = encodeFunctionData( {
            abi: this.#abi,
            functionName: 'transferWithAuthorization',
            args: [ from, to, value, validAfter, validBefore, nonce, v, r, s ]
        } )

        const hash = await this.#walletClient.sendTransaction({
            to: tokenAddress,
            data
        });

        this.#log( `✅ Settlement broadcasted: ${ hash }` )
        return { ok: true, txHash: hash }
    }

    #splitVRS( signatureHex ) {
        const sig = signatureHex.startsWith( '0x' ) ? signatureHex.slice( 2 ) : signatureHex
        const r = '0x' + sig.slice( 0, 64 )
        const s = '0x' + sig.slice( 64, 128 )
        const v = parseInt( sig.slice( 128, 130 ), 16 )
        return { v, r, s }
    }
}


export { ServerExact }