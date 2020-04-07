'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const EjsEngine = require('../../View/engines/EjsEngine');

/**
 * Executes setup operations of all the built-in templating engines.
 */
class ViewProvider extends Provider {
    /**
     * Executes setup operations of all the built-in templating engines.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        EjsEngine.setup();
    }
}

module.exports = ViewProvider;
