'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const CacheRepository = require('../../Cache/CacheRepository');
const Cache = require('../../Cache/Cache');
const Router = require('../../Routing/Router');
const BaseRoute = require('../../Routing/BaseRoute');
const RouteRepository = require('../../Routing/RouteRepository');
const ResourceRoute = require('../../Routing/ResourceRoute');
const ResolvedRoute = require('../../Routing/ResolvedRoute');
const RouteResolver = require('../../Routing/RouteResolver');
const {
    InvalidArgumentException,
    NotFoundHTTPException,
    NotImplementedYetException
} = require('../../Exceptions');

/**
 * @typedef {Object} ResolvedRouteDraft Represents the required information used to create the "ResolvedRoute" object.
 *
 * @property {BaseRoute} route An instance of the class "BaseRoute" representing the route that has been found or resolved based on current request URL.
 * @property {ResolvedRouteOptions} options An object containing all the other information related to this route and used when generating the definitive "ResolvedRoute" object.
 */

/**
 * @typedef {Object} RouteProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Set<Router>} [routers] A set containing all the routers whom routes will be processed during route resolution.
 * @property {boolean} [cache=true] If set to "true" resolved routes will be cached for next occurrences.
 * @property {?Cache} [cacheProvider] An instance of the class "Cache" representing the cache provider to use, if set to null the one registered as "@routeProcessor" will be used, otherwise the default one.
 * @property {?string} [defaultLanguage] A string representing the default language to use whenever no client language has been defined or no route version is available in the language declared by the client.
 * @property {string} [routeResolverAlgorithm="subset"] A string containing the name of the algorithm to use when resolving a route, the algorithm will be defined as property of the instance of the class "RouteResolver" generated on-the-fly.
 */

/**
 * Allows to resolve an URL finding the route that corresponds the most.
 */
class RouteProcessor extends Processor {
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
     * Generates the key to use when caching the result of a resolution based on current client request data.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {?string} A string containing the generated cache key or null if the key cannot be generated.
     */
    static _generateCacheKey(request){
        let key = null;
        if ( request.hasOwnProperty('server') && request.server !== null && typeof request.server === 'object' ){
            // Clean out GET parameters.
            const query = request.url.indexOf('?');
            const url = query === -1 ? request.url : request.url.substr(0, query);
            let languageSignature = '';
            if ( request.hasOwnProperty('consideredLanguages') && request.consideredLanguages instanceof Set ){
                // Generate a serialized list of all the languages that have been considered during the resolution process.
                for ( const language of request.consideredLanguages ){
                    if ( language !== null ){
                        languageSignature += ':' + language;
                    }
                }
            }
            // Generate the cache key: it must be unique by server, URL and languages.
            key = request.server.getID() + ':' + url + languageSignature;
        }
        return key;
    }

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
            defaultLanguage: null,
            routeResolverAlgorithm: 'subset'
        };
    }

    /**
     * Collects all the languages supported by the client which issued the given request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     */
    _generateRequestLanguagesList(request){
        // Store languages in a unique set taking care of order (by affinity).
        const languages = new Set();
        if ( request.hasOwnProperty('declaredLanguage') && request.declaredLanguage !== null ){
            // Add the language that has been found using language declaration in request processor.
            languages.add(request.declaredLanguage);
        }
        if ( request.hasOwnProperty('preferredLanguage') && request.preferredLanguage !== '' && typeof request.preferredLanguage === 'string' ){
            // Add the language having the highest score according to user provided languages (HTTP header).
            languages.add(request.preferredLanguage);
        }
        if ( request.hasOwnProperty('languages') && request.languages instanceof Map ){
            // Add all the other languages specified by the user (HTTP header).
            const genericCodes = [];
            for ( const [code, score] of request.languages ){
                const components = code.split('-');
                if ( components.length === 2 ){
                    genericCodes.push(components[0]);
                }
                // Add integral versions first.
                languages.add(code);
            }
            // Add the language codes extracted from ISO codes (for instance en-US -> en).
            const length = genericCodes.length;
            for ( let i = 0 ; i < length ; i++ ){
                languages.add(genericCodes[i]);
            }
        }
        if ( this._defaultLanguage !== null ){
            languages.add(this._defaultLanguage);
        }
        // Add a null in order to allow to use a generic non localized version if no other language is found.
        languages.add(null);
        request.consideredLanguages = languages;
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
            }else{
                timeBuffer = process.hrtime(timeBuffer);
                stats.cachedRouteLookupTime = ( timeBuffer[0] * 1000 ) + ( timeBuffer[1] / 1000000 );
            }
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
     * Finds out the route matching the given request's URL by process each route contained in all the defined routers.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {RouteResolutionStats} stats An object containing the information about times taken in route resolution, result lookup time spent on cache side will be added to this object.
     *
     * @return {?ResolvedRouteDraft} An object containing both the route found and its associated parameters, if no route is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid request object is given.
     *
     * @async
     * @protected
     */
    _resolveByProcessing(request, stats){
        if ( !request.hasOwnProperty('url') || request.url === '' || typeof request.url !== 'string' ){
            throw new InvalidArgumentException('Invalid request object.');
        }
        if ( !request.hasOwnProperty('method') || !BaseRoute.isSupportedMethod(request.method) ){
            return null;
        }
        let timeBuffer = process.hrtime();
        // Generate the instance of the resolver and set the algorithm to use in resolution.
        const resolver = new RouteResolver(this._routers, this._routeResolverAlgorithm);
        // Find out the route that matches current request URL.
        const result = resolver.resolve(request);
        timeBuffer = process.hrtime(timeBuffer);
        stats.routingTime = ( timeBuffer[0] * 1000 ) + ( timeBuffer[1] / 1000000 );
        return result === null ? null : {
            route: result.route,
            options: ( result.allowsParameters ? {
                parameters: result.parameters,
                stats: stats,
                router: result.router
            } : {
                path: result.path,
                stats: stats,
                router: result.router
            } )
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

        /**
         * @type {string} _routeResolverAlgorithm A string containing the name of the algorithm to use when resolving a route, the algorithm will be defined as property of the instance of the class "RouteResolver" generated on-the-fly.
         *
         * @protected
         */
        this._routeResolverAlgorithm = 'subset';

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
        if ( configuration.hasOwnProperty('routeResolverAlgorithm') && RouteResolver.isSupportedAlgorithm(configuration.routeResolverAlgorithm) ){
            this._routeResolverAlgorithm = configuration.routeResolverAlgorithm;
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
     * @return {Promise<?ResolvedRoute>} An instance of the class "ResolvedRoute" representing the route found and associated properties such as parameters.
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
        // Generate the list of the languages that resolver algorithm should take care of while processing this request.
        this._generateRequestLanguagesList(request);
        let resolvedRoute = null;
        if ( request.skipRouteProcessing !== true ){
            // Generate the key to use in resolution result caching, it must take care of server ID, request path and all the user languages being considered.
            const cacheKey = RouteProcessor._generateCacheKey(request);
            const stats = RouteProcessor._generateRouteResolutionStatsObject();
            // Check if a route matching this URL has been cached and retrieve it.
            let resolvedRouteDraft = cacheKey === null ? null : await this._resolveByCache(request, cacheKey, stats);
            const fromCache = resolvedRouteDraft !== null;
            if ( !fromCache ){
                // No cached version for this route is found or cache is disabled, process it from scratch.
                resolvedRouteDraft = this._resolveByProcessing(request, stats);
                if ( resolvedRouteDraft === null ){
                    throw new NotFoundHTTPException('No route matching given URL were found.', 1);
                }
                // Save the route found into the cache.
                resolvedRouteDraft.options.cached = cacheKey === null ? false : this._saveToCache(cacheKey, resolvedRouteDraft);
            }
            resolvedRouteDraft.options.fromCache = fromCache;
            resolvedRoute = request.resolvedRoute = new ResolvedRoute(resolvedRouteDraft.route, resolvedRouteDraft.options);
        }
        return resolvedRoute;
    }
}

module.exports = RouteProcessor;
