'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const CacheDriverRepository = require('../../Cache/CacheDriverRepository');
const FileCacheDriver = require('../../Cache/drivers/FileCacheDriver');

class FileSupportProvider extends Provider {
    /**
     * Registers all the required classes in order to integrate the file support in submodules such as cache and session.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        await CacheDriverRepository.register('file', FileCacheDriver, true);
    }
}

module.exports = FileSupportProvider;