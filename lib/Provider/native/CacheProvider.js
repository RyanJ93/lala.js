'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheRepository = require('../../Cache/CacheRepository');
const CacheTemplate = require('../../Cache/CacheTemplate');

/**
 *
 */
class CacheProvider extends Provider {
    /**
     *
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