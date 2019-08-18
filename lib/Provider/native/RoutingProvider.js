'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const {
    Router,
    RouterRepository
} = require('../../Routing');

/**
 * This class allows to setup some general purposes routers available in the whole project.
 */
class RoutingProvider extends Provider {
    /**
     * Registers some useful general purposes predefined routers.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        RouterRepository.register('web', new Router());
        RouterRepository.register('api', new Router());
        RouterRepository.register('assets', new Router());
        RouterRepository.setDefault('web');
    }
}

module.exports = RoutingProvider;
