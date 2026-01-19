// Selection Policy for X402 v2 exact/evm
// Deterministic comparator for payment option selection


class SelectionPolicy {
    static createDefaultSelectionPolicy() {
        return {
            preferredNetworkOrder: [],
            preferredAssetOrder: [],
            tieBreaker: 'lowest-amount'
        }
    }


    static selectBestOption( { candidateList, policy = null } ) {
        if( candidateList.length === 0 ) {
            return { selectedOption: null, selectionReason: 'no_candidates' }
        }

        if( candidateList.length === 1 ) {
            return { selectedOption: candidateList[ 0 ], selectionReason: 'single_candidate' }
        }

        const effectivePolicy = policy || SelectionPolicy.createDefaultSelectionPolicy()
        const { preferredNetworkOrder, preferredAssetOrder, tieBreaker } = effectivePolicy

        // Sort candidates by policy
        const sortedCandidates = [ ...candidateList ]
            .sort( ( a, b ) => {
                // 1. Preferred network order
                const aNetworkIndex = preferredNetworkOrder.indexOf( a.network )
                const bNetworkIndex = preferredNetworkOrder.indexOf( b.network )
                const aNetworkScore = aNetworkIndex === -1 ? Infinity : aNetworkIndex
                const bNetworkScore = bNetworkIndex === -1 ? Infinity : bNetworkIndex

                if( aNetworkScore !== bNetworkScore ) {
                    return aNetworkScore - bNetworkScore
                }

                // 2. Preferred asset order
                const aAssetIndex = preferredAssetOrder.indexOf( a.asset )
                const bAssetIndex = preferredAssetOrder.indexOf( b.asset )
                const aAssetScore = aAssetIndex === -1 ? Infinity : aAssetIndex
                const bAssetScore = bAssetIndex === -1 ? Infinity : bAssetIndex

                if( aAssetScore !== bAssetScore ) {
                    return aAssetScore - bAssetScore
                }

                // 3. Tie breaker
                if( tieBreaker === 'lowest-amount' ) {
                    const aAmount = BigInt( a.amount )
                    const bAmount = BigInt( b.amount )

                    if( aAmount < bAmount ) {
                        return -1
                    }
                    if( aAmount > bAmount ) {
                        return 1
                    }
                }

                // 4. Stable fallback: lexicographic by network + asset
                const aKey = `${a.network}:${a.asset}`
                const bKey = `${b.network}:${b.asset}`

                return aKey.localeCompare( bKey )
            } )

        return { selectedOption: sortedCandidates[ 0 ], selectionReason: 'policy_selected' }
    }
}


export { SelectionPolicy }
