import { describe, test, expect } from '@jest/globals'
import { ErrorCodes } from '../../src/v2/errors/errorCodes.mjs'


describe( 'ErrorCodes', () => {
    test( 'exports all expected error code constants', () => {
        const expectedCodes = [
            'INVALID_PAYLOAD',
            'INVALID_PAYMENT_REQUIREMENTS',
            'INVALID_NETWORK',
            'INVALID_EXACT_EVM_PAYLOAD_SIGNATURE',
            'INVALID_EXACT_EVM_PAYLOAD_VALUE',
            'INVALID_EXACT_EVM_PAYLOAD_NONCE',
            'INVALID_EXACT_EVM_PAYLOAD_TIMEOUT',
            'INVALID_CONFIGURATION',
            'SETTLEMENT_FAILED',
            'SIMULATION_FAILED',
            'NO_MATCHING_PAYMENT_OPTION'
        ]

        expectedCodes
            .forEach( ( code ) => {
                expect( ErrorCodes[ code ] ).toBeDefined()
                expect( typeof ErrorCodes[ code ] ).toBe( 'string' )
            } )
    } )
} )
