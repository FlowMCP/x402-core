import fs from 'fs'


class EnvironmentManager {
    static getConfig() {
        const environmentConfig = {
            'env': {
                'development': './../../.env',
                'production': './../.env'
            },
            'schemas': {
                'development': './../../../schemas/v1.2.0/',
                'production': './../../../schemas/v1.2.0/'
            }
        }

        return { environmentConfig }
    }


    static getStageType( { argvs } ) {
        const finding = argvs
            .find( arg => arg.startsWith( '--stage=' ) )
        if( !finding ) {
            console.warn( 'No stage type provided, defaulting to "development"' )
            return { stageType: 'development' }
        }
        const stageType = finding.split( '=' )[ 1 ].trim()
        console.log( `Stage type: ${stageType}` )

        return { stageType }
    }

/*
    static getEnvObject( { stageType, environmentConfig } ) {
        const envObject = this
            .#loadEnv( { stageType, environmentConfig } )
            .split( "\n" )
            .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
            .map( line => line.split( '=' ) )
            .reduce( ( acc, [ k, v ] ) => {
                acc[ k ] = v.trim()
                return acc
            }, {} )

        return { envObject }
    }
*/

    static getPackageVersion() {
        const { version: managerVersion } = JSON.parse( fs.readFileSync( './package.json', 'utf-8' ) )
        console.log( `Manager version: ${managerVersion}` )
        return { managerVersion }
    }

/*
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
*/
}


export { EnvironmentManager }