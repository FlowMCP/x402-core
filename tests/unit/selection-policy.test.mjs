import { describe, test, expect } from '@jest/globals'
import { SelectionPolicy } from '../../src/v2/exact/evm/selectionPolicy.mjs'


describe( 'SelectionPolicy', () => {
    describe( 'createDefaultSelectionPolicy', () => {
        test( 'returns policy with empty preferred orders and lowest-amount tieBreaker', () => {
            const policy = SelectionPolicy.createDefaultSelectionPolicy()

            expect( policy.preferredNetworkOrder ).toEqual( [] )
            expect( policy.preferredAssetOrder ).toEqual( [] )
            expect( policy.tieBreaker ).toBe( 'lowest-amount' )
        } )
    } )


    describe( 'selectBestOption', () => {
        test( 'returns null for empty candidate list', () => {
            const { selectedOption, selectionReason } = SelectionPolicy
                .selectBestOption( { candidateList: [] } )

            expect( selectedOption ).toBeNull()
            expect( selectionReason ).toBe( 'no_candidates' )
        } )


        test( 'returns single candidate directly', () => {
            const candidate = { network: 'eip155:8453', asset: '0xUSDC', amount: '1000000' }
            const { selectedOption, selectionReason } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidate ] } )

            expect( selectedOption ).toBe( candidate )
            expect( selectionReason ).toBe( 'single_candidate' )
        } )


        test( 'selects lowest amount with default policy', () => {
            const candidateA = { network: 'eip155:8453', asset: '0xUSDC', amount: '2000000' }
            const candidateB = { network: 'eip155:8453', asset: '0xUSDC', amount: '1000000' }

            const { selectedOption, selectionReason } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidateA, candidateB ] } )

            expect( selectedOption.amount ).toBe( '1000000' )
            expect( selectionReason ).toBe( 'policy_selected' )
        } )


        test( 'respects preferred network order', () => {
            const candidateA = { network: 'eip155:43114', asset: '0xUSDC', amount: '1000000' }
            const candidateB = { network: 'eip155:8453', asset: '0xUSDC', amount: '1000000' }

            const policy = {
                preferredNetworkOrder: [ 'eip155:8453', 'eip155:43114' ],
                preferredAssetOrder: [],
                tieBreaker: 'lowest-amount'
            }

            const { selectedOption } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidateA, candidateB ], policy } )

            expect( selectedOption.network ).toBe( 'eip155:8453' )
        } )


        test( 'respects preferred asset order when networks match', () => {
            const candidateA = { network: 'eip155:8453', asset: '0xDAI', amount: '1000000' }
            const candidateB = { network: 'eip155:8453', asset: '0xUSDC', amount: '1000000' }

            const policy = {
                preferredNetworkOrder: [],
                preferredAssetOrder: [ '0xUSDC', '0xDAI' ],
                tieBreaker: 'lowest-amount'
            }

            const { selectedOption } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidateA, candidateB ], policy } )

            expect( selectedOption.asset ).toBe( '0xUSDC' )
        } )


        test( 'uses lexicographic fallback when amounts match', () => {
            const candidateA = { network: 'eip155:8453', asset: '0xBBB', amount: '1000000' }
            const candidateB = { network: 'eip155:8453', asset: '0xAAA', amount: '1000000' }

            const { selectedOption } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidateA, candidateB ] } )

            expect( selectedOption.asset ).toBe( '0xAAA' )
        } )


        test( 'applies default policy when policy is null', () => {
            const candidateA = { network: 'eip155:8453', asset: '0xUSDC', amount: '5000000' }
            const candidateB = { network: 'eip155:8453', asset: '0xUSDC', amount: '1000000' }

            const { selectedOption } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidateA, candidateB ], policy: null } )

            expect( selectedOption.amount ).toBe( '1000000' )
        } )


        test( 'non-preferred networks sort after preferred', () => {
            const candidateA = { network: 'eip155:999', asset: '0xUSDC', amount: '500000' }
            const candidateB = { network: 'eip155:8453', asset: '0xUSDC', amount: '2000000' }

            const policy = {
                preferredNetworkOrder: [ 'eip155:8453' ],
                preferredAssetOrder: [],
                tieBreaker: 'lowest-amount'
            }

            const { selectedOption } = SelectionPolicy
                .selectBestOption( { candidateList: [ candidateA, candidateB ], policy } )

            expect( selectedOption.network ).toBe( 'eip155:8453' )
        } )
    } )
} )
