'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const RouteProcessor = require('../RouteProcessor');
const Router = require('../../../Routing/Router');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "RouteProcessor" based on given configuration.
 */
class RouteProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = RouteProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the routers to consider whenever resolving a route, this method is chainable.
     *
     * @param {Set<Router>} routers A set containing the routers as instances of the class "Router".
     *
     * @returns {RouteProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid set is given.
     */
    setRouters(routers){
        if ( !( routers instanceof Set ) ){
            throw new InvalidArgumentException('Invalid routers set.', 1);
        }
        this._properties.routers = routers;
        return this;
    }

    /**
     * Sets the routers to consider whenever resolving a route, this method is chainable.
     *
     * @param {Router[]} routers A sequential array containing the routers represented as instances of the class "Router".
     *
     * @returns {RouteProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRoutersAsArray(routers){
        if ( !Array.isArray(routers) ){
            throw new InvalidArgumentException('Invalid routers array.', 1);
        }
        // Remove all other router from the list.
        this._properties.routers = new Set();
        const length = routers.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( routers[i] instanceof Router ){
                this._properties.routers.add(routers[i]);
            }
        }
        return this;
    }

    /**
     * Returns the routers the resolver will care about when resolving a route as a set.
     *
     * @return {Set<Router>} A set containing the routers as instances of the class "Router".
     */
    getRouters(){
        return this._properties.routers;
    }

    /**
     * Returns the routers the resolver will care about when resolving a route as a sequential array.
     *
     * @return {Router[]} A sequential array containing the routes represented as instance of the class "Router".
     */
    getRoutersAsArray(){
        return this._properties.routers.size === 0 ? [] : Array.from(this._properties.routers);
    }

    /**
     * Sets if resolved routes should be cached or not, this method is chainable.
     *
     * @param {boolean} cache If set to "true" resolved routes will be cached.
     *
     * @returns {RouteProcessorFactory}
     */
    setCache(cache){
        this._properties.cache = cache === true;
        return this;
    }

    /**
     * Returns if resolved routes are going to be cached or not.
     *
     * @return {boolean} If routes are going to be cached will be returned "true".
     */
    getCache(){
        return this._properties.cache === true;
    }

    /**
     * Sets the cache provider used to cache resolved routes, this method is chainable.
     *
     * @param {?Cache} provider An instance of the class "Cache" representing the cache provider or null if routes should not be cached.
     *
     * @returns {RouteProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid cache provider object is given.
     */
    setCacheProvider(provider){
        if ( provider !== null && !( provider instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache provider.', 1);
        }
        this._properties.cacheProvider = provider;
        return this;
    }

    /**
     * Returns the cache provider to use to cache resolved routes.
     *
     * @return {?Cache} An instance of the class "Cache" representing the cache provider or null if no provider has been defined.
     */
    getCacheProvider(){
        return this._properties.cacheProvider;
    }

    /**
     * Sets the language to use to pick a localized version of a route if no language has been defined by the client or if the client provided language is not available, this method is chainable.
     *
     * @param {?string} language A string representing the language code.
     *
     * @return {RouteProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid language is given.
     */
    setDefaultLanguage(language){
        if ( language !== null && ( language === '' || typeof language !== 'string' ) ){
            throw new InvalidArgumentException('Invalid language.', 1);
        }
        this._properties.defaultLanguage = language;
        return this;
    }

    /**
     * Returns the language to use to pick a localized version of a route if no language has been defined by the client or if the client provided language is not available.
     *
     * @return {?string} A string representing the language code or null if no language has been defined.
     */
    getDefaultLanguage(){
        return this._properties.defaultLanguage;
    }

    /**
     * Generates an instance of the class "RouteProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {RouteProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const routeProcessor = new RouteProcessor();
        // Configuring class instance.
        routeProcessor.configure(this._properties);
        return routeProcessor;
    }
}

module.exports = RouteProcessorFactory;
