import { describe, test, expect } from '@jest/globals'
import { NonceStore } from '../../src/v1/exact/evm/NonceStore.mjs'


describe( 'NonceStore', () => {
    test( 'reports unused nonce as not used', () => {
        const store = new NonceStore()
        const result = store.isUsed( { nonceKey: '0xabc' } )

        expect( result ).toBe( false )
    } )


    test( 'reports used nonce as used after markUsed', () => {
        const store = new NonceStore()
        store.markUsed( { nonceKey: '0xabc' } )
        const result = store.isUsed( { nonceKey: '0xabc' } )

        expect( result ).toBe( true )
    } )


    test( 'tracks multiple nonces independently', () => {
        const store = new NonceStore()
        store.markUsed( { nonceKey: '0xaaa' } )

        expect( store.isUsed( { nonceKey: '0xaaa' } ) ).toBe( true )
        expect( store.isUsed( { nonceKey: '0xbbb' } ) ).toBe( false )
    } )


    test( 'marking same nonce twice does not error', () => {
        const store = new NonceStore()
        store.markUsed( { nonceKey: '0xabc' } )
        store.markUsed( { nonceKey: '0xabc' } )
        const result = store.isUsed( { nonceKey: '0xabc' } )

        expect( result ).toBe( true )
    } )
} )
