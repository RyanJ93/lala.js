'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const CacheRepository = require('../../Cache/CacheRepository');
const Cache = require('../../Cache/Cache');
const Router = require('../../Routing/Router');
const BaseRoute = require('../../Routing/BaseRoute');
const ParameterizedRoute = require('../../Routing/ParameterizedRoute');
const RouteRepository = require('../../Routing/RouteRepository');
const ResourceRoute = require('../../Routing/ResourceRoute');
const ResolvedRoute = require('../../Routing/ResolvedRoute');
const {
    InvalidArgumentException,
    NotFoundHTTPException,
    NotImplementedYetException
} = require('../../Exceptions');

/**
 * @typedef ResolvedRouteDraft Represents the required information used to create the "ResolvedRoute" object.
 *
 * @property {BaseRoute} route An instance of the class "BaseRoute" representing the route that has been found or resolved based on current request URL.
 * @property {ResolvedRouteOptions} options An object containing all the other information related to this route and used when generating the definitive "ResolvedRoute" object.
 */

/**
 * @typedef RouteProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Set<Router>} [routers] A set containing all the routers whom routes will be processed during route resolution.
 * @property {boolean} [cache=true] If set to "true" resolved routes will be cached for next occurrences.
 * @property {?Cache} [cacheProvider] An instance of the class "Cache" representing the cache provider to use, if set to null the one registered as "@routeProcessor" will be used, otherwise the default one.
 * @property {?string} [defaultLanguage] A string representing the default language to use whenever no client language has been defined or no route version is available in the language declared by the client.
 */

/**
 * Allows to resolve an URL finding the route that corresponds the most.
 */
class RouteProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {RouteProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            routers: new Set(),
            cache: true,
            cacheProvider: null,
            defaultLanguage: null
        };
    }

    /**
     * Generates an empty object used to store lookup statistical information.
     *
     * @return {RouteResolutionStats} An object containing all the statistical information set to zero.
     *
     * @protected
     */
    static _generateRouteResolutionStatsObject(){
        return {
            routingTime: 0,
            cachedRouteLookupTime: 0,
            routeParamsProcessingTime: 0
        };
    }

    /**
     * Returns the cache provider to use for resolved routes caching.
     *
     * @returns {?Cache} An instance of the class "Cache" representing the cache provider or null if no provider has been defined.
     *
     * @protected
     */
    _getCacheProviderObject(){
        let provider = null;
        if ( this._cache === true ){
            if ( this._cacheProvider instanceof Cache ){
                provider = this._cacheProvider;
            }else if ( CacheRepository.has('@routeProcessor') ){
                provider = CacheRepository.get('@routeProcessor');
            }else if ( CacheRepository.has('@default') ){
                provider = CacheRepository.get('@default');
            }
        }
        return provider;
    }

    /**
     * Saves a route to the cache.
     *
     * @param {string} key A string representing the unique key used to identify this route, composed by the server ID and request URL.
     * @param {ResolvedRouteDraft} resolvedRouteDraft An object representing the route that has been found during resolution and its related parameters.
     *
     * @returns {boolean} Returns "true" if saving has been initialized, otherwise "false" if item cannot be saved because of cache configuration.
     *
     * @protected
     */
    _saveToCache(key, resolvedRouteDraft){
        let cached = false;
        // Get the cache provider according to defined settings.
        const cache = this._getCacheProviderObject();
        if ( cache !== null ){
            setImmediate(async () => {
                const routeID = resolvedRouteDraft.route.getID();
                const routerID = resolvedRouteDraft.options.router.getID();
                // TODO: Set "routerID" and "serverID" as tag (waiting for task #LALA-12 to be completed).
                await cache.set(key, {
                    routeID: routeID,
                    parameters: resolvedRouteDraft.options.parameters
                }, {
                    overwrite: true
                });
            });
            cached = true;
        }
        return cached;
    }

    /**
     * Finds and returns a cached route and its parameters based on a given URL.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {string} key A string containing the unique key used as
     * @param {RouteResolutionStats} stats An object containing the information about times taken in route resolution, result lookup time spent on cache side will be added to this object.
     *
     * @returns {Promise<?ResolvedRouteDraft>} An object containing both the route found and its associated parameters, if no route is found, null will be returned instead.
     *
     * @async
     * @protected
     */
    async _resolveByCache(request, key, stats){
        let timeBuffer = process.hrtime();
        let resolvedRoute = null;
        // Check if cache is enabled and a provider has been defined, then get it.
        const cache = this._getCacheProviderObject();
        if ( cache !== null ){
            let routeData = await cache.get(key, {
                silent: true
            });
            if ( routeData !== null ){
                // Check if the item is found and if it's a valid cached route.
                if ( typeof routeData !== 'object' || !routeData.hasOwnProperty('routeID') || routeData.routeID === '' || typeof routeData.routeID !== 'string' ){
                    // Remove this cached route as it appear to be invalid.
                    this._dropCacheItem(key);
                }else{
                    // Get the route object based on the ID found.
                    const route = RouteRepository.get(routeData.routeID);
                    if ( route === null ){
                        // Remove this cached route as it doesn't exist anymore.
                        this._dropCacheItem(key);
                    }else{
                        const path = routeData.hasOwnProperty('path') && routeData.path !== '' && typeof routeData.path === 'string' ? routeData.path : null;
                        const parameters = routeData.hasOwnProperty('parameters') && routeData.parameters !== null && typeof routeData.parameters === 'object' ? routeData.parameters : null;
                        if ( path === null && route instanceof ResourceRoute ){
                            // The object found is not a valid route, it will be removed.
                            this._dropCacheItem(key);
                        }else{
                            // Find the router the route found belongs to.
                            const router = this._findOwnerRouter(routeData.routeID);
                            timeBuffer = process.hrtime(timeBuffer);
                            stats.cachedRouteLookupTime = ( timeBuffer[0] * 1000 ) + ( timeBuffer[1] / 1000000 );
                            resolvedRoute = {
                                route: route,
                                options: {
                                    parameters: parameters,
                                    path: path,
                                    stats: stats,
                                    router: router
                                }
                            };
                        }
                    }
                }
            }
            timeBuffer = process.hrtime(timeBuffer);
            stats.cachedRouteLookupTime = ( timeBuffer[0] * 1000 ) + ( timeBuffer[1] / 1000000 );
        }
        return resolvedRoute;
    }

    /**
     * Removes a given element from the cache.
     *
     * @param {string} key A string containing the identifier of the item to remove.
     *
     * @protected
     */
    _dropCacheItem(key){
        // Get the cache provider according to defined settings.
        const cache = this._getCacheProviderObject();
        if ( cache !== null ){
            setImmediate(async () => {
                // The item is not valid, then remove it.
                await cache.remove(key);
            });
        }
    }

    /**
     * Finds the router that the given route belongs to.
     *
     * @param {string} routeID A string containing the unique ID of the routFe to look for.
     *
     * @returns {?Router} An instance of the class "Router" representing the router found or null if no router containing the given route is found.
     *
     * @protected
     */
    _findOwnerRouter(routeID){
        let routerFound = null;
        for ( const router of this._routers ){
            if ( router.hasRoute(routeID) ){
                routerFound = router;
                break;
            }
        }
        return routerFound;
    }

    /**
     *
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {BaseRoute} route
     *
     * @return {boolean}
     *
     * @protected
     */
    _isAcceptableLocalizedVersion(request, route){
        let valid = false;
        const routeLanguage = route.getLanguage();
        const clientLanguage = request.hasOwnProperty('preferredLanguage') ? request.preferredLanguage : null;
        // TODO: Implement this method.
        return true;
    }

    /**
     * Finds out the route matching the given request's URL by process each route contained in all the defined routers.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {RouteResolutionStats} stats An object containing the information about times taken in route resolution, result lookup time spent on cache side will be added to this object.
     *
     * @return {Promise<?ResolvedRouteDraft>} An object containing both the route found and its associated parameters, if no route is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid request object is given.
     *
     * @async
     * @protected
     */
    async _resolveByProcessing(request, stats){
        if ( !request.hasOwnProperty('url') || request.url === '' || typeof request.url !== 'string' ){
            throw new InvalidArgumentException('Invalid request object.');
        }
        if ( !request.hasOwnProperty('method') || !BaseRoute.isSupportedMethod(request.method) ){
            return null;
        }
        // Clean out the GET parameters.
        // TODO
        const url = request.url.indexOf('?') === -1 ? request.url : request.url.substr(0, request.url.indexOf('?'));
        const language = request.hasOwnProperty('preferredLanguage') && request.preferredLanguage !== null ? request.preferredLanguage : this._defaultLanguage;
        let routeFound = null, matchesFound = null, routerFound = null, routeBuffer = null, matchesBuffer = null, routerBuffer = null, pathFound = null, parameters = null;
        let timeBuffer = process.hrtime();
        const routerData = [];
        // Resource routes require the HTTP request to be done using the GET method.
        let length = 0;
        for ( const router of this._routers ){
            // Prepare all the routes registered within current router and the prefix that has been defined for current router, they will be reused in next stage.
            routerData[length] = {
                routes: router.getRoutesSet(),
                prefix: router.getPrefix(),
                router: router
            };
            if ( typeof routerData[length].prefix !== 'string' || url.indexOf(routerData[length].prefix) === 0 ){
                // Remove the prefix defined from the original URL, if present.
                routerData[length].relativeURL = typeof routerData[length].prefix === 'string' ? url.substr(routerData[length].prefix.length) : url;
                if ( request.method === 'GET' ){
                    for ( const route of routerData[length].routes ){
                        if ( route instanceof ResourceRoute ){
                            // Process only the resource routes in current stage.
                            if ( routerData[length].relativeURL.indexOf(route.getPath()) === 0 && this._isAcceptableLocalizedVersion(request, route) ){
                                // Resource routes require the URL to start by the route path, then, the remaining part, defines the path to the requested file.
                                routeFound = route;
                                routerFound = length;
                                const base = route.getPath();
                                pathFound = routerData[length].relativeURL.substr(base.length);
                                return {
                                    route: routeFound,
                                    options: {
                                        path: pathFound,
                                        stats: stats
                                    }
                                };
                            }
                        }
                    }
                }
            }
            length++;
        }
        for ( let i = 0 ; i < length ; i++ ){
            if ( typeof routerData[i].prefix !== 'string' || url.indexOf(routerData[i].prefix) === 0 ){
                for ( const route of routerData[i].routes ){
                    if ( !( route instanceof ResourceRoute ) ){
                        // Process al the other routes.
                        const routeMethod = route.getMethod();
                        if ( routeMethod === request.method || ( routeMethod === '*' && routeBuffer === null ) ){
                            const path = route.getPath();
                            const isRegex = route.isRegex();
                            const internalRegex = route.getRegex();
                            const routeLanguage = route.getLanguage();
                            if ( routeMethod === request.method ){
                                // This route matches the request method, so
                                if ( !isRegex && internalRegex === null ){
                                    if ( routerData[i].relativeURL === path && this._isAcceptableLocalizedVersion(request, route) ){
                                        routeFound = route;
                                        routerFound = routerData[i].router;
                                        break;
                                    }
                                    continue;
                                }
                                matchesFound = ( internalRegex === null ? path : internalRegex ).exec(routerData[i].relativeURL);
                                if ( matchesFound !== null && this._isAcceptableLocalizedVersion(request, route) ){
                                    routeFound = route;
                                    routerFound = routerData[i].router;
                                    break;
                                }
                                continue;
                            }
                            if ( !isRegex && internalRegex === null ){
                                if ( routerData[i].relativeURL === path && this._isAcceptableLocalizedVersion(request, route) ){
                                    routeBuffer = route;
                                    routerBuffer = routerData[i].router;
                                    break;
                                }
                                continue;
                            }
                            matchesBuffer = ( internalRegex === null ? path : internalRegex ).exec(routerData[i].relativeURL);
                            if ( matchesBuffer !== null && this._isAcceptableLocalizedVersion(request, route) ){
                                routeBuffer = route;
                                routerBuffer = routerData[i].router;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if ( routeFound === null ){
            if ( routeBuffer === null ){
                return null;
            }
            routeFound = routeBuffer;
            routerFound = routerBuffer;
            matchesFound = matchesBuffer;
        }
        timeBuffer = process.hrtime(timeBuffer);
        stats.routingTime = ( timeBuffer[0] * 1000 ) + ( timeBuffer[1] / 1000000 );
        timeBuffer = process.hrtime();
        if ( routeFound instanceof ParameterizedRoute ){
            // This route supports parameters: assign parameters found.
            const placeholders = Array.from(routeFound.getParameters());
            if ( placeholders.length !== 0 ){
                if ( matchesFound === null || matchesFound.length < placeholders.length ){
                    return null;
                }
                parameters = {};
                for ( let i = 1 ; i < matchesFound.length ; i++ ){
                    if ( placeholders[i - 1] !== '' && typeof placeholders[i - 1] === 'string' ){
                        parameters[placeholders[i - 1]] = matchesFound[i];
                    }
                }
            }
        }
        timeBuffer = process.hrtime(timeBuffer);
        stats.routeParamsProcessingTime = ( timeBuffer[0] * 1000 ) + ( timeBuffer[1] / 1000000 );
        return {
            route: routeFound,
            options: {
                parameters: parameters,
                stats: stats,
                router: routerFound
            }
        };
    }

    /**
     * The class constructor.
     *
     * @param {?RouteProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Set<Router>} _routers A set containing all the routers to process whenever resolving a route.
         *
         * @protected
         */
        this._routers = new Set();

        /**
         * @type {boolean} [_cache=true] If set to "true" it means that resolved routes will be cached for next uses.
         *
         * @protected
         */
        this._cache = true;

        /**
         * @type {?Cache} _cacheProvider An instance of the class "Cache" representing the provider used to cache resolved routes.
         *
         * @protected
         */
        this._cacheProvider = null;

        /**
         * @type {?string} [_defaultLanguage] A string representing the default language to use whenever no client language has been defined or no route version is available in the language declared by the client.
         *
         * @protected
         */
        this._defaultLanguage = null;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {RouteProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {RouteProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('routers') && configuration.routers instanceof Set ){
            this._routers = configuration.routers;
        }
        if ( configuration.hasOwnProperty('cacheProvider') && configuration.cacheProvider instanceof Cache ){
            this._cacheProvider = configuration.cacheProvider;
        }
        if ( configuration.hasOwnProperty('defaultLanguage') && ( configuration.defaultLanguage === null || ( configuration.defaultLanguage !== '' && typeof configuration.defaultLanguage === 'string' ) ) ){
            this._defaultLanguage = configuration.defaultLanguage;
        }
        this._cache = !configuration.hasOwnProperty('cache') || configuration.cache !== false;
        return this;
    }

    /**
     * Drops all data related to resolved routes that have been cached.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotImplementedYetException} This method cannot be used as of now because it has not been implemented yet.
     *
     * @async
     */
    async invalidateRouteCache(){
        // TODO: To be implemented once task #LALA-12 has been completed.
        throw new NotImplementedYetException('This method has not been implemented yet.');
    }

    /**
     * Processes request URL in order to find out the route that corresponds the most.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<ResolvedRoute>} An instance of the class "ResolvedRoute" representing the route found and associated properties such as parameters.
     *
     * @throws {InvalidArgumentException} If an invalid request object is given.
     * @throws {NotFoundHTTPException} If no route matching current request URL is found.
     *
     * @async
     */
    async process(request, response){
        if ( !request.hasOwnProperty('url') || request.url === '' || typeof request.url !== 'string' ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        // Clean out GET parameters.
        const query = request.url.indexOf('?');
        const url = query === -1 ? request.url : request.url.substr(0, query);
        // Generates the unique key used for route caching.
        const cacheKey = request.hasOwnProperty('server') && request.server !== null && typeof request.server === 'object' ? ( request.server.getID() + ':' + url ) : null;
        const stats = RouteProcessor._generateRouteResolutionStatsObject();
        // Check if a route matching this URL has been cached and retrieve it.
        let resolvedRouteDraft = cacheKey === null ? null : await this._resolveByCache(request, cacheKey, stats);
        const fromCache = resolvedRouteDraft !== null;
        if ( !fromCache ){
            // No cached version for this route is found or cache is disabled, process it from scratch.
            resolvedRouteDraft = await this._resolveByProcessing(request, stats);
            if ( resolvedRouteDraft === null ){
                throw new NotFoundHTTPException('No route matching given URL were found.', 1);
            }
            // Save the route found into the cache.
            resolvedRouteDraft.options.cached = cacheKey === null ? false : this._saveToCache(cacheKey, resolvedRouteDraft);
        }
        resolvedRouteDraft.options.fromCache = fromCache;
        return new ResolvedRoute(resolvedRouteDraft.route, resolvedRouteDraft.options);
    }
}

module.exports = RouteProcessor;
