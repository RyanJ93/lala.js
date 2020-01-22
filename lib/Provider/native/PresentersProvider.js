'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const ServerPresenters = require('../../Server/presenters');

/**
 * This class is required to register all the built-in presenter functions.
 */
class PresentersProvider extends Provider {
    /**
     * Registers all the built-in presenter functions.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        ServerPresenters.AuthorizationProcessorPresenters.registerPresenters();
    }
}

module.exports = PresentersProvider;
