// EnvironmentManager v2
// Loads environment credentials from .env file

import fs from 'fs'


class EnvironmentManager {
    static getCredentials( { envPath, envSelection } ) {
        const rawEnv = this
            .#loadEnv( { envPath } )
            .split( '\n' )
            .filter( ( line ) => line && !line.startsWith( '#' ) && line.includes( '=' ) )
            .map( ( line ) => line.split( '=' ) )
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
                        .map( ( key ) => {
                            const item = rawEnv[ key ]

                            if( item === undefined ) {
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
            throw new Error( `Environment loading failed: ${messages.join( ', ' )}` )
        }

        const { credentials, privateKey } = Object
            .entries( selection )
            .reduce( ( acc, [ key, value ] ) => {
                if( key.toLowerCase().includes( 'privatekey' ) ) {
                    if( acc[ 'privateKey' ] !== null ) {
                        console.warn( 'Multiple private keys found, using the first one' )

                        return acc
                    }
                    acc[ 'privateKey' ] = value
                } else {
                    acc[ 'credentials' ][ key ] = value
                }

                return acc
            }, { 'credentials': {}, 'privateKey': null } )

        return { credentials, privateKey }
    }


    static #loadEnv( { envPath } ) {
        if( !envPath ) {
            throw new Error( 'No environment file path provided' )
        }

        const envFile = fs.readFileSync( envPath, 'utf-8' )

        return envFile
    }
}


export { EnvironmentManager }
