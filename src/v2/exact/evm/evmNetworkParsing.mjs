// EVM Network Parsing Helper for X402 v2
// Parses eip155:<chainId> format


class EvmNetworkParsing {
    static parseEip155NetworkId( { paymentNetworkIdToParse } ) {
        if( typeof paymentNetworkIdToParse !== 'string' ) {
            return {
                parsedChainIdNumber: null,
                parseError: 'paymentNetworkId must be a string'
            }
        }

        if( !paymentNetworkIdToParse.startsWith( 'eip155:' ) ) {
            return {
                parsedChainIdNumber: null,
                parseError: `paymentNetworkId must start with "eip155:", got "${paymentNetworkIdToParse}"`
            }
        }

        const chainIdString = paymentNetworkIdToParse.slice( 7 )
        const parsedChainIdNumber = parseInt( chainIdString, 10 )

        if( isNaN( parsedChainIdNumber ) ) {
            return {
                parsedChainIdNumber: null,
                parseError: `Invalid chain ID number: "${chainIdString}"`
            }
        }

        return { parsedChainIdNumber, parseError: null }
    }


    static createEip155NetworkId( { chainIdNumber } ) {
        const paymentNetworkId = `eip155:${chainIdNumber}`

        return { paymentNetworkId }
    }
}


export { EvmNetworkParsing }
