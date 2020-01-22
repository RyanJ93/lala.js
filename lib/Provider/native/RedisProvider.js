'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheDriverRepository = require('../../Cache/CacheDriverRepository');
const ConnectionFactoryRepository = require('../../Database/ConnectionFactoryRepository');
const RedisCacheDriver = require('../../Cache/drivers/RedisCacheDriver');
const RedisConnectionFactory = require('../../Database/factories/RedisConnectionFactory');

/**
 * This class is required to install all the features that involve Redis interaction.
 */
class RedisProvider extends Provider {
    /**
     * Registers all the required classes in order to integrate the Redis support in submodules such as cache and session.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        await CacheDriverRepository.register('redis', RedisCacheDriver, true);
        await ConnectionFactoryRepository.register('redis', RedisConnectionFactory, true);
    }
}

module.exports = RedisProvider;