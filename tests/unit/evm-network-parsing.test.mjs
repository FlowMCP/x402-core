import { describe, test, expect } from '@jest/globals'
import { EvmNetworkParsing } from '../../src/v2/exact/evm/evmNetworkParsing.mjs'


describe( 'EvmNetworkParsing', () => {
    describe( 'parseEip155NetworkId', () => {
        test( 'parses valid eip155 network id', () => {
            const { parsedChainIdNumber, parseError } = EvmNetworkParsing
                .parseEip155NetworkId( { paymentNetworkIdToParse: 'eip155:8453' } )

            expect( parsedChainIdNumber ).toBe( 8453 )
            expect( parseError ).toBeNull()
        } )


        test( 'parses eip155:1 for mainnet', () => {
            const { parsedChainIdNumber, parseError } = EvmNetworkParsing
                .parseEip155NetworkId( { paymentNetworkIdToParse: 'eip155:1' } )

            expect( parsedChainIdNumber ).toBe( 1 )
            expect( parseError ).toBeNull()
        } )


        test( 'rejects non-string input', () => {
            const { parsedChainIdNumber, parseError } = EvmNetworkParsing
                .parseEip155NetworkId( { paymentNetworkIdToParse: 123 } )

            expect( parsedChainIdNumber ).toBeNull()
            expect( parseError ).toBe( 'paymentNetworkId must be a string' )
        } )


        test( 'rejects missing eip155 prefix', () => {
            const { parsedChainIdNumber, parseError } = EvmNetworkParsing
                .parseEip155NetworkId( { paymentNetworkIdToParse: 'solana:mainnet' } )

            expect( parsedChainIdNumber ).toBeNull()
            expect( parseError ).toContain( 'must start with "eip155:"' )
        } )


        test( 'rejects invalid chain id number', () => {
            const { parsedChainIdNumber, parseError } = EvmNetworkParsing
                .parseEip155NetworkId( { paymentNetworkIdToParse: 'eip155:abc' } )

            expect( parsedChainIdNumber ).toBeNull()
            expect( parseError ).toContain( 'Invalid chain ID number' )
        } )
    } )


    describe( 'createEip155NetworkId', () => {
        test( 'creates network id from chain id number', () => {
            const { paymentNetworkId } = EvmNetworkParsing
                .createEip155NetworkId( { chainIdNumber: 8453 } )

            expect( paymentNetworkId ).toBe( 'eip155:8453' )
        } )


        test( 'creates mainnet network id', () => {
            const { paymentNetworkId } = EvmNetworkParsing
                .createEip155NetworkId( { chainIdNumber: 1 } )

            expect( paymentNetworkId ).toBe( 'eip155:1' )
        } )
    } )
} )
