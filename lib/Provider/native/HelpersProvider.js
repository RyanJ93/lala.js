'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const ServerHelpers = require('../../Server/helpers');
const BuiltInHelpers = require('../../Helpers/helpers');

/**
 * This class is required to register all the built-in helper functions.
 */
class HelpersProvider extends Provider {
    /**
     * Registers all the built-in helper functions.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        ServerHelpers.HTTPCookieProcessorHelpers.registerHelpers();
        ServerHelpers.HTTPRequestProcessorHelpers.registerHelpers();
        ServerHelpers.WSServerHelpers.registerHelpers();
        BuiltInHelpers.BuiltInHelpers.registerHelpers();
    }
}

module.exports = HelpersProvider;
