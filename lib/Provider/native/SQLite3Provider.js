'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheDriverRepository = require('../../Cache/CacheDriverRepository');
const ConnectionFactoryRepository = require('../../Database/ConnectionFactoryRepository');
const SQLite3CacheDriver = require('../../Cache/drivers/SQLite3CacheDriver');
const SQLite3ConnectionFactory = require('../../Database/factories/SQLite3ConnectionFactory');

/**
 * This class is required to install all the features that involve SQLite3 database interaction.
 */
class SQLite3Provider extends Provider {
    /**
     * Registers all the required classes in order to integrate the SQLite3 support in submodules such as cache and session.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        await CacheDriverRepository.register('sqlite3', SQLite3CacheDriver, true);
        await ConnectionFactoryRepository.register('sqlite3', SQLite3ConnectionFactory, true);
    }
}

module.exports = SQLite3Provider;