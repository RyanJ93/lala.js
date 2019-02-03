'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheDriverRepository = require('../../Cache/CacheDriverRepository');
const DatabaseCacheDriver = require('../../Cache/drivers/DatabaseCacheDriver');

class DatabaseSupportProvider extends Provider {
    /**
     * Registers all the required classes in order to integrate the generic database support in submodules such as cache and session.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        await CacheDriverRepository.register('database', DatabaseCacheDriver, true);
    }
}

module.exports = DatabaseSupportProvider;