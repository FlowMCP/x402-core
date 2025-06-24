import fs from "fs"


class X402ConfigManager {
    static getCredentials( { stageType, environmentConfig, envSelection } ) {
        const rawEnv = this
            .#loadEnv( { stageType, environmentConfig } )
            .split( "\n" )
            .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
            .map( line => line.split( '=' ) )
            .reduce( ( acc, [ k, v ] ) => {
                acc[ k ] = v.trim()
                return acc
            }, {} )

        const messages = []
        const selection = envSelection
            .reduce( ( acc, select ) => {
                const [ varName, envKey ] = select
                if( Array.isArray( envKey ) ) {
                    acc[ varName ] = envKey
                        .map( key => {
                            const item = rawEnv[ key ]
                            if ( item === undefined ) {
                                messages.push( `Missing environment variable: ${key}` )
                            }
                            return item
                        } )
                } else {
                    acc[ varName ] = rawEnv[ envKey ]
                }
                return acc
            }, {} )

        if( messages.length > 0 ) {
            throw new Error( `Environment loading failed: ${ messages.join( ', ' ) }` )
        }

        const { x402Credentials, privateKey } = Object
            .entries( selection )
            .reduce( ( acc, [ key, value ] ) => {
                if( key.toLowerCase().includes( 'privatekey' ) ) {
                    if( acc['privateKey'] !== null ) { console.warn( `Multiple private keys found, using the first one` ); return acc }
                    acc['privateKey'] = value
                } else {
                    acc['x402Credentials'][ key ] = value
                }
                return acc
            }, { 'x402Credentials': {}, 'privateKey': null } )

        return { x402Credentials, privateKey }
    }

/*
    static getCredentials( { envObject, envSelection } ) {
        const messages = []
        const selection = envSelection
            .reduce( ( acc, select ) => {
                const [ varName, envKey ] = select
                if( Array.isArray( envKey ) ) {
                    acc[ varName ] = envKey
                        .map( key => {
                            const item = envObject[ key ]
                            if ( item === undefined ) {
                                messages.push( `Missing environment variable: ${key}` )
                            }
                            return item
                        } )
                } else {
                    acc[ varName ] = envObject[ envKey ]
                }
                return acc
            }, {} )

        const { x402Credentials, privateKey } = Object
            .entries( selection )
            .reduce( ( acc, [ key, value ] ) => {
                if( key.toLowerCase().includes( 'privatekey' ) ) {
                    if( acc['privateKey'] !== null ) { console.warn( `Multiple private keys found, using the first one` ); return acc }
                    acc['privateKey'] = value
                } else {
                    acc['x402Credentials'][ key ] = value
                }
                return acc
            }, { 'x402Credentials': {}, 'privateKey': null } )

        if ( messages.length > 0 ) {
            throw new Error( `X402Config.getCredentials: ${messages.join( ", \n" )}` )
        }

        return { x402Credentials, privateKey }
    }
*/

    static #loadEnv( { stageType, environmentConfig } ) {
        const path = environmentConfig['env'][ stageType ]
        if( !path ) {
            console.error( `No environment file found for stage type: ${stageType}` )
            return false
        }

        const envFile = fs
            .readFileSync( path, 'utf-8' )
        return envFile
    }
}


export { X402ConfigManager }