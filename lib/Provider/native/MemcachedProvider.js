'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheDriverRepository = require('../../Cache/CacheDriverRepository');
const ConnectionFactoryRepository = require('../../Database/ConnectionFactoryRepository');
const MemcachedCacheDriver = require('../../Cache/drivers/MemcachedCacheDriver');
const MemcachedConnectionFactory = require('../../Database/factories/MemcachedConnectionFactory');

class MemcachedProvider extends Provider {
    /**
     * Registers all the required classes in order to integrate the Memcached support in submodules such as cache and session.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        await CacheDriverRepository.register('memcached', MemcachedCacheDriver, true);
        await ConnectionFactoryRepository.register('memcached', MemcachedConnectionFactory, true);
    }
}

module.exports = MemcachedProvider;