'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheRepository = require('../../Cache/CacheRepository');
const CacheTemplate = require('../../Cache/CacheTemplate');

/**
 * This class allows to setup default cache providers.
 */
class CacheProvider extends Provider {
    /**
     * Setups the default cache provider.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        if ( !CacheRepository.has('@default') ){
            const template = new CacheTemplate();
            template.setDriver('local').register('@default');
            const cache = template.buildCacheObject();
            CacheRepository.register('@default', cache);
        }
    }
}

module.exports = CacheProvider;