'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const ParameterizedRoute = require('./ParameterizedRoute');
const Router = require('./Router');
const ResourceRoute = require('./ResourceRoute');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef ResolvedRouteOptions Defined the properties to setup when creating a new instance of this class.
 *
 * @property {?{string: string}} [parameters=null] An object having as key the parameter name and as value the corresponding value found by processing the request URL.
 * @property {?string} [path=null] A string representing the path extracted by processing the request URL and used to serve a file is the given route is a resource route.
 * @property {?RouteResolutionStats} stats An object containing times and information about route resolution process.
 * @property {?boolean} [fromCache=false] If set to "true" it means that the route found was obtained from a cached result.
 * @property {?boolean} [cached=false] If set to "true" it means that the route found has been processed from scratch and then saved into the cache.
 * @property {?Router} router An instance of the class "Router" representing the router this route belongs to.
 */

/**
 * @typedef RouteResolutionStats Represents the object containing all the statistical information about route lookup process.
 *
 * @property {number} routingTime The amount of time, in microseconds, the routing resolution took.
 * @property {number} cachedRouteLookupTime The amount of time, in microseconds, the route cache lookup took.
 * @property {number} routeParamsProcessingTime The amount of time, in microseconds, the request URL parameters process took.
 */

/**
 * This class represent the result obtained after having performed a route resolution on a request path.
 */
class ResolvedRoute {
    /**
     * The class constructor.
     *
     * @param {BaseRoute} route An instance of the class "BaseRoute" or another class inheriting from it representing the route that has been found during URL resolution.
     * @param {?ResolvedRouteOptions} options An object containing all the parameters associated to this route.
     */
    constructor(route, options = null){
        if ( !( route instanceof BaseRoute ) && !( route instanceof ParameterizedRoute ) ){
            throw new InvalidArgumentException('Invalid route.', 1);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }

        /**
         * @type {BaseRoute} _route An instance of the class "BaseRoute" or another class inheriting from it representing the resolved route.
         *
         * @protected
         */
        this._route = route;

        /**
         * @type {Object.<string, string>} _parameters An object containing the parameters found while processing the request URL.
         *
         * @protected
         */
        this._parameters = options.parameters !== null && typeof options.parameters === 'object' ? options.parameters : {};

        /**
         * @type {?string} _path A string containing the path to the file to serve if the given route is is a resource route.
         *
         * @protected
         */
        this._path = typeof options.path === 'string' && options.path !== '' ? options.path : null;

        /**
         * @type {boolean} _resource If set to "true" it means that the resolved route is meant to serve static assets.
         *
         * @protected
         */
        this._resource = route instanceof ResourceRoute;

        /**
         * @type {number} _parametersCount An integer number greater or equal than zero containing how many parameters have been found during request URL processing.
         *
         * @protected
         */
        this._parametersCount = Object.keys(this._parameters).length;

        /**
         * @type {RouteResolutionStats} _stats An object containing information related to route resolution time.
         *
         * @protected
         */
        this._stats = typeof options.stats === 'object' ? options.stats : null;

        /**
         * @type {boolean} [_fromCache=false] If set to "true" it means that this route has been obtained from a cached result rather than a real-time process.
         *
         * @protected
         */
        this._fromCache = options.fromCache === true;

        /**
         * @type {boolean} [_cached=false] If set to "true" it means that this route resolution result has been cached for next uses.
         *
         * @protected
         */
        this._cached = options.cached === true;

        /**
         * @type {?Router} _router An instance of the class "Router" representing the router the resolved route belongs to.
         *
         * @protected
         */
        this._router = options.router instanceof Router ? options.router : null;
    }

    /**
     * Returns the resolved route.
     *
     * @return {BaseRoute} An instance of the class "BaseRoute" or another class inheriting from it representing the resolved route.
     */
    getRoute(){
        return this._route;
    }

    /**
     * Returns the parameters matching the parameters defined for this route path that have been found.
     *
     * @return {Object.<string, string>} An object having as key the parameter name and as value its value as a string.
     */
    getParameters(){
        return this._parameters;
    }

    /**
     * Returns the path to the file that will be served to the client, this property is defined only if a "ResourceRoute" is represented by this class.
     *
     * @return {?string} A string representing the path to the file or null if current route is not a "ResourceRoute" class instance.
     */
    getPath(){
        return this._path;
    }

    /**
     * Returns if the route represented by this class is an instance of the class "ResourceRoute", then a route mapping a static assets folder.
     *
     * @return {boolean} If the route is an instance of the class "ResourceRoute" will be returned "true".
     */
    isResourceRoute(){
        return this._resource;
    }

    /**
     * Returns how many parameters have been found while processing the request URL according to the parameters defined in the route path.
     *
     * @return {number} An integer number greater or equal than zero representing the parameters count.
     */
    getParametersCount(){
        return this._parametersCount;
    }

    /**
     * Returns the timing stats related to the route resolution process.
     *
     * @return {RouteResolutionStats} An object containing the statistical information.
     */
    getStats(){
        return this._stats;
    }

    /**
     * Returns if the route has been resolved by processing routes or if it come from the cache.
     *
     * @return {boolean} If this route has been resolved from the cache will be returned "true".
     */
    isFromCache(){
        return this._fromCache === true;
    }

    /**
     * Returns if this route has been cached for next resolutions or not.
     *
     * @return {boolean} If this route has been cached after being resolved will be returned "true".
     */
    isCached(){
        return this._cached === true;
    }

    /**
     * Returns the route current route belongs to.
     *
     * @returns {?Router} An instance of the class "Router" representing the router.
     */
    getRouter(){
        return this._router;
    }
}

module.exports = ResolvedRoute;
