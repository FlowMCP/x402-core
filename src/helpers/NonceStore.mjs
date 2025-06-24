class NonceStore {
    constructor() {
        this.store = new Set()
    }


    isUsed( { nonceKey } ) {
        return this.store.has( nonceKey )
    }


    markUsed( { nonceKey } ) {
        this.store.add( nonceKey )
    }
}


export { NonceStore }