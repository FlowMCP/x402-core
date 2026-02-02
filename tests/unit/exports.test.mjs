import { describe, test, expect } from '@jest/globals'
import { v1, v2, legacy } from '../../src/index.mjs'


describe( 'x402-core exports', () => {
    test( 'root index exports v1, v2, legacy namespaces', () => {
        expect( v1 ).toBeDefined()
        expect( v2 ).toBeDefined()
        expect( legacy ).toBeDefined()
    } )


    test( 'v2 namespace exports exact, types, transports, errors, config', () => {
        expect( v2.exact ).toBeDefined()
        expect( v2.types ).toBeDefined()
        expect( v2.transports ).toBeDefined()
        expect( v2.errors ).toBeDefined()
        expect( v2.config ).toBeDefined()
    } )


    test( 'v1 namespace exports exact', () => {
        expect( v1.exact ).toBeDefined()
    } )
} )
