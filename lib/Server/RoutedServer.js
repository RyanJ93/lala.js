'use strict';

// Including Lala's modules.
const Server = require('./Server');
const Router = require('../Routing/Router');
const RouteResolver = require('../Routing/RouteResolver');
const RouterRepository = require('../Routing/RouterRepository');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Implements a basic server providing support for routes.
 *
 * @abstract
 */
/* abstract */ class RoutedServer extends Server {
    /**
     * Resolves the request URL finding the corresponding route and then executing it.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @return {Promise<*>} Some data returned after route execution, if no data should sent back to the client, null will be returned instead.
     *
     * @async
     * @private
     */
    async _route(request, response){
        return await this._routeResolver.handle(request, response);
    }

    /**
     * Handles a client request by running access middleware functions and routing engine.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @private
     */
    async _handleRequest(request, response) {
        try{
            await super._handleRequest(request, response);
            return await this._route(request, response);
            return null;
        }catch(ex){
            await this._handleException(ex, request, response);
        }
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'RoutedServer' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {Set<Router>} _routers A set containing all the routers that are queried whenever a request occurs.
         *
         * @private
         */
        this._routers = new Set();

        /**
         * @type {RouteResolver} An instance of the class "RouteResolver" used to process client request and allowing to find the route matching the request URL.
         *
         * @private
         */
        this._routeResolver = new RouteResolver();
    }

    /**
     * Adds a router to the list of the routers to query whenever a request occurs, this method is chainable.
     *
     * @param {Router} router An instance of the class "Router" representing the router to add and use.
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid router object is given.
     */
    addRouter(router){
        if ( !router instanceof Router ){
            throw new InvalidArgumentException('Invalid router object.', 1);
        }
        this._routers.add(router);
        // Refresh routers list in resolver instance.
        const routers = Array.from(this._routers);
        this._routeResolver.setRouters(routers);
        return this;
    }

    /**
     * Adds a registered router to the list, this method is chainable.
     *
     * @param {string} name A string representing the router unique name that has been used to register it.
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid router name is given.
     */
    addRouterByName(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid router name.', 1);
        }
        // Lookup the router object by its name from routers repository, assuming it has been registered.
        const router = RouterRepository.get(name);
        if ( router !== null ){
            this.addRouter(router);
        }
        return this;
    }

    /**
     * Removes a given route from the list of all the queried routers, this method is chainable.
     *
     * @param {Router} router An instance of the class "Router" representing the router to remove.
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid router object is given.
     */
    removeRouter(router){
        if ( !router instanceof Router ){
            throw new InvalidArgumentException('Invalid router object.', 1);
        }
        this._routers.delete(router);
        const routers = Array.from(this._routers);
        this._routeResolver.setRouters(routers);
        return this;
    }

    /**
     * Removes a router from the list, this method is chainable.
     *
     * @param {string} name A string representing the router unique name that has been used to register it.
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid router name is given.
     */
    removeRouterByName(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid router name.', 1);
        }
        const router = RouterRepository.get(name);
        if ( router !== null ){
            this.removeRouter(router);
        }
        return this;
    }

    /**
     * Sets the routers to query whenever a request occurs, this method is chainable.
     *
     * @param routers A sequential array of routers represented as instances of the class "Router".
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRouters(routers){
        if ( !Array.isArray(routers) ){
            throw new InvalidArgumentException('Invalid router array.', 1);
        }
        // Remove all the existing routers before adding the others.
        this._routers = new Set();
        const length = routers.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( routers[i] instanceof Router ){
                this._routers.add(routers[i]);
            }
        }
        this._routeResolver.setRouters(routers);
        return this;
    }

    /**
     * Sets the routers to query, this method is chainable.
     *
     * @param {string[]} names A sequential array of strings containing the unique name of the routers to use, note they must have been registered using the given name.
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRoutersByName(names){
        if ( !Array.isArray(names) ){
            throw new InvalidArgumentException('Invalid router array.', 1);
        }
        this._routers = new Set();
        const length = names.length;
        const routers = [];
        for ( let i = 0 ; i < length ; i++ ){
            // Get the router matching current name.
            const router = RouterRepository.get(names[i]);
            if ( router !== null ){
                this._routers.add(router);
                routers.push(router);
            }
        }
        this._routeResolver.setRouters(routers);
        return this;
    }

    /**
     * Returns all the routers queried while handling client requests, this method is chainable.
     *
     * @return {Router[]} A sequential array containing the routers as instances of the class "Router".
     */
    getRouters(){
        return this._routers.size === 0 ? [] : Array.from(this._routers);
    }

    /**
     * Removes all the routers queried while handling client requests, this method is chainable.
     *
     * @return {RoutedServer}
     */
    dropRouters(){
        this._routers = new Set();
        this._routeResolver.setRouters([]);
        return this;
    }

    /**
     * Sets if requested URLs should be cached after resolution or not, this method is chainable.
     *
     * @param {boolean} cache If set to "true", routes obtained after URL resolution will be cached.
     *
     * @return {RoutedServer}
     */
    setRoutingCache(cache){
        this._routeResolver.setCache(cache);
        return this;
    }

    /**
     * Returns if requested URLs should be cached after resolution or not.
     *
     * @returns {boolean} If routes are going to be cached will be returned "true".
     */
    getRoutingCache(){
        return this._routeResolver.getCache();
    }

    /**
     * Sets the cache provider that will be used to cache resolved URLs, this method is chainable.
     *
     * @param {Cache} provider An instance of the class "Cache" representing the cache provider to use.
     *
     * @returns {RoutedServer}
     */
    setRoutingCacheProvider(provider){
        this._routeResolver.setCacheProvider(provider);
        return this;
    }

    /**
     * Returns the cache provider that will be used to cache resolved URLs.
     *
     * @returns {Cache} An instance of the class "Cache" representing the cache provider that has been defined.
     */
    getRoutingCacheProvider(){
        return this._routeResolver.getCacheProvider();
    }

    /**
     * Removes all the cached data regarding the resolved URLs.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async invalidateRouteCache(){
        //TODO: Add support to this method once tag support will be introduced in cache engine.
    }
}

module.exports = RoutedServer;