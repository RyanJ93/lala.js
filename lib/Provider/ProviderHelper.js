'use strict';

// Including Lala's modules.
const Provider = require('./Provider');
const NativeProviders = require('./native');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * This class allows providers installation and management.
 */
class ProviderHelper {
    /**
     * Installs and run the setup method of a given provider.
     *
     * @param {function} provider The provider class, note that it must extend the "Provider" class.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid provider class is given.
     *
     * @async
     */
    static async setupProvider(provider){
        if ( typeof provider !== 'function' || Object.getPrototypeOf(provider) !== Provider ){
            throw new InvalidArgumentException('Invalid provider class.', 1);
        }
        await provider.setup();
    }

    /**
     * Installs all the native providers such as cache, session and database drivers shipped with the framework.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setupNativeProviders(){
        let processes = [];
        for ( const providerName in NativeProviders ){
            if ( NativeProviders.hasOwnProperty(providerName) ){
                processes.push(ProviderHelper.setupProvider(NativeProviders[providerName]));
            }
        }
        await Promise.all(processes);
    }
}

module.exports = ProviderHelper;