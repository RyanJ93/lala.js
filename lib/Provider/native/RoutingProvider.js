'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const Cache = require('../../Cache/Cache');
const {
    Router,
    RouterRepository,
    RouteResolver
} = require('../../Routing');

/**
 *
 */
class RoutingProvider extends Provider {
    /**
     *
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        const cache = new Cache();
        await cache.setDriver('local');
        cache.setNamespace('com.lala.routing');
        RouteResolver.setDefaultCache(true);
        RouteResolver.setDefaultCacheProvider(cache);
        RouterRepository.register('web', new Router());
        RouterRepository.register('api', new Router());
        RouterRepository.register('assets', new Router());
        RouterRepository.setDefault('web');
    }
}

module.exports = RoutingProvider;