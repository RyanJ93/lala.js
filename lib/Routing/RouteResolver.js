'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const Router = require('./Router');
const BaseRoute = require('./BaseRoute');
const ResourceRoute = require('./ResourceRoute');
const Cache = require('../Cache/Cache');
const {
    InvalidArgumentException,
    RequestRejectedException,
    NotFoundHTTPException,
    MethodNotAllowedHTTPException,
    UnauthorizedHTTPException
} = require('../Exceptions');

/**
 * @type {boolean} _defaultCache If set to "true" it means that by default routed request will be cached to speed up further resolutions.
 *
 * @private
 */
let _defaultCache = false;

/**
 * @type {(Cache|null)} _cacheProvider An instance of the class "Cache" representing the cache provider used to cache resolved routes.
 *
 * @private
 */
let _defaultCacheProvider = null;

/**
 * This class allows to find the corresponding route from a given client request and then process it.
 */
class RouteResolver {
    /**
     * Sets if resolved routes should be cached by default.
     *
     * @param cache If set to "true" it means that by default resolved routes should be cached.
     */
    static setDefaultCache(cache){
        _defaultCache = cache === true;
    }

    /**
     * Returns if resolved routes should be cached by default.
     *
     * @returns {boolean} If by default resolved routes are going to be cached will be returned "true", otherwise "false".
     */
    static getDefaultCache(){
        return _defaultCache === true;
    }

    /**
     * Sets the cache provider used by default to cached resolved routes.
     *
     * @param {(Cache|null)} provider An instance of the class "Cache" representing the provider or null if no provider should be used.
     */
    static setDefaultCacheProvider(provider){
        if ( provider !== null && !( provider instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache handler.', 1);
        }
        _defaultCacheProvider = provider;
    }

    /**
     * Returns the default cache provider defined.
     *
     * @returns {(Cache|null)} An instance of the class "Cache" representing the cache provider or null if no provider has been defined.
     */
    static getDefaultCacheProvider(){
        return _defaultCacheProvider;
    }

    /**
     * Returns the cache provider to use for resolved routes caching.
     *
     * @returns {(Cache|null)} An instance of the class "Cache" representing the cache provider or null if no provider has been defined.
     *
     * @private
     */
    _getCacheProviderObject(){
        return this.getCache() ? ( this._cacheProvider !== null ? this._cacheProvider : RouteResolver.getDefaultCacheProvider() ) : null;
    }

    /**
     * The class constructor.
     *
     * @param {Router[]} [routers] A sequential array containing all the routers that the resolver must consider whenever resolving a route.
     */
    constructor(routers){
        /**
         * @type {Set<Router>}
         *
         * @private
         */
        this._routers = new Set();
        this._cache = _defaultCache;
        this._cacheProvider = null;

        if ( Array.isArray(routers) ){
            this.setRouters(routers);
        }
    }

    /**
     * Sets the routers to consider whenever resolving a route, this method is chainable.
     *
     * @param {Router[]} routers A sequential array containing the routes represented as instance of the class "Router".
     *
     * @return {RouteResolver}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRouters(routers){
        if ( !Array.isArray(routers) ){
            throw new InvalidArgumentException('Invalid routers array.', 1);
        }
        // Remove all other router from the list.
        this._routers = new Set();
        const length = routers.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( routers[i] instanceof Router ){
                this._routers.add(routers[i]);
            }
        }
        return this;
    }

    /**
     * Returns the routers the resolver will care about when resolving a route.
     *
     * @return {Router[]} A sequential array containing the routes represented as instance of the class "Router".
     */
    getRouters(){
        return this._routers.size === 0 ? [] : Array.from(this._routers);
    }

    /**
     * Sets if resolved routes should be cached or not, this method is chainable.
     *
     * @param {boolean} cache If set to "true" resolved routes will be cached.
     *
     * @return {RouteResolver}
     */
    setCache(cache){
        this._cache = cache === true;
        return this;
    }

    /**
     * Returns if resolved routes are going to be cached or not.
     *
     * @return {boolean} If routes are going to be cached will be returned "true".
     */
    getCache(){
        return this._cache === true;
    }

    /**
     * Sets the cache provider used to cache resolved routes, this method is chainable.
     *
     * @param {(Cache|null)} provider An instance of the class "Cache" representing the cache provider or null if routes should not be cached.
     *
     * @return {RouteResolver}
     *
     * @throws {InvalidArgumentException} If an invalid cache provider object is given.
     */
    setCacheProvider(provider){
        if ( provider !== null && !( provider instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache provider.', 1);
        }
        this._cacheProvider = provider;
        return this;
    }

    /**
     * Returns the cache provider to use to cache resolved routes.
     *
     * @return {(Cache|null)} An instance of the class "Cache" representing the cache provider or null if no provider has been defined.
     */
    getCacheProvider(){
        return this._cacheProvider;
    }

    /**
     * Executes all the given middleware functions.
     *
     * @param {function[]} functions A sequential array containing all the middleware functions to execute.
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @return {Promise<boolean>} If current request can be processed according to executed middleware function will be returned "true".
     *
     * @async
     * @private
     */
    static async _runMiddlewareStack(functions, request, response, customArgs = null){
        const length = functions.length;
        if ( length === 0 ){
            return true;
        }
        let pointer = 0;
        // Prepare the function that allow other middlewares to be executed is current request should continue.
        const next = async () => {
            pointer++;
            // Pick the first next function available.
            while ( pointer < length && typeof functions[pointer] !== 'function' ){
                pointer++;
            }
            if ( pointer < length ){
                await functions[pointer](...args);
            }
        };
        // Get the first available function.
        while ( pointer < length && typeof functions[pointer] !== 'function' ){
            pointer++;
        }
        const args = Array.isArray(customArgs) ? customArgs.concat([request, response, next]) : [request, response, next];
        if ( pointer < length ){
            await functions[pointer](...args);
        }
        return length <= pointer;
    }

    /**
     * Finds the first router containing the given route by searching in all the defined routers.
     *
     * @param {string} routeID A string representing the route ID used to lookup the url within all the defined routers.
     *
     * @returns {(BaseRoute|null)} An instance of the class representing the route, that must extend the "BaseRoute" class, or null if no route is found.
     *
     * @private
     */
    _getRouterByRouteID(routeID){
        // Loop through all the defined routers.
        for ( const element of this._routers ){
            const routes = element.getRoutes();
            const length = routes.length;
            // Find the route ID in each router.
            for ( let i = 0 ; i < length ; i++ ){
                if ( routes[i].getID() === routeID ){
                    return element;
                }
            }
        }
        return null;
    }

    /**
     * Executes all middleware functions used to mutate or interact with request parameters defined globally, at router level and for the current route.
     *
     * @param result
     * @param request
     * @param response
     *
     * @return {Promise<object>} If the request can be processed and completed will be returned "true", otherwise "false".
     *
     * @async
     * @private
     */
     async _runParamMiddlewares(result, router, request, response){
        if ( result.parametersCount === 0 ){
            // If no parameter were found in the given route return "true" as no middleware is going to be executed.
            return {};
        }
        const parameterKeys = Object.keys(result.parameters);
        const functions = [[], []];
        let length = parameterKeys.length;
        for ( let i = 0 ; i < 2 ; i++ ){
            const elements = i === 0 ? Router.getGlobalParamMiddlewares() : router.getParamMiddlewares();
            for ( const [identifier, middleware] of elements ){
                //
                const glob = middleware.params.has('*');
                let eligible = false;
                if ( !glob ){
                    for ( let n = 0 ; n < length ; n++ ){
                        if ( middleware.params.has(parameterKeys[n]) ){
                            eligible = true;
                            break;
                        }
                    }
                }
                if ( glob || eligible ){
                    functions[i].push(middleware.handler);
                }
            }
        }
        const valid = await RouteResolver._runMiddlewareStack(functions[0], request, response, [result.parameters]);
        return !valid ? false : await RouteResolver._runMiddlewareStack(functions[1], request, response, [result.parameters]);
    }

    async _authenticate(route, router, request, response){
         const routeAuth = route.getAuth();
         const auth = routeAuth === null && router.getAuth() ? true : ( routeAuth === true );
         if ( auth ){
             request.authenticator = routeAuth === true ? route.getAuthenticator() : router.getAuthenticator();
             if ( request.authenticator !== null ){
                 // TODO: Authentication result should be now standardized as an "AuthenticationResult" object.
                 const user = await request.authenticator.authenticateRequest(request);
                 if ( user.hasOwnProperty('user') && user.hasOwnProperty('session') ){
                     request.user = user.user;
                     request.authenticationSession = user.session;
                 }else{
                     request.user = user;
                     request.authenticationSession = null;
                 }
             }
         }
         return true;
    }

    /**
     *
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     *
     */
    async handle(request, response){
        const time = process.hrtime();
        // Executing global middlewares before finding the matching route.
        let middlewares = Object.values(Router.getGlobalMiddlewares());
        let valid = await RouteResolver._runMiddlewareStack(middlewares, request, response);
        if ( !valid ){
            throw new RequestRejectedException('The request has been rejected by middlewares.', 5);
        }
        // Find the matching route for the given request.
        const result = await this.resolve(request);
        // Throw a 404 if no route were found for the given path or HTTP method.
        if ( result === null ){
            throw new NotFoundHTTPException('No matching route has been found.', 3);
        }
        //
        const router = this._getRouterByRouteID(result.route.getID());
        request.route = result.route;
        request.router = router;
        //
        const auth = await this._authenticate(result.route, router, request, response);
        if ( !auth ){
            throw new UnauthorizedHTTPException('A valid authenticated user is required.', 9);
        }
        middlewares = Array.from(result.route.getMiddlewares().values());
        valid = await RouteResolver._runMiddlewareStack(middlewares, request, response);
        if ( !valid ){
            throw new RequestRejectedException('The request has been rejected by middlewares.', 6);
        }
        // Execute middlewares for parameters.
        const allowed = await this._runParamMiddlewares(result, router, request, response);
        if ( !allowed ){
            throw new RequestRejectedException('The request has been rejected by param middlewares.', 7);
        }
        // Merge processed parameters with existing ones, parameters obtained from the URL should be available as GET parameters.
        request.query = result.parameters !== null && typeof result.parameters === 'object' ? Object.assign(result.parameters, request.query) : request.query;
        if ( result.route instanceof ResourceRoute ){
            // Get the path to the original file to return.
            const path = result.route.getLocation() + '/' + result.path;
            if ( !filesystem.existsSync(path) ){
                // If this file doesn't exist just throw a 404.
                throw new NotFoundHTTPException('The requested resource was not found.', 8);
            }
            // Send the file to the connected client.
            await response.serveFile(path);
            return null;
        }
        request.processingTime = ( time[0] * 1000 ) + ( time[1] / 1000000 );
        // If middlewares response is positive, continue processing the request.
        const data = await result.route.execute(request, response);
        return typeof data !== 'undefined' ? data : null;
    }

    /**
     *
     *
     * @param item
     *
     * @private
     */
    _dropCacheItem(item){
        //
        const cache = this._getCacheProviderObject();
        if ( cache !== null ){
            setImmediate(async () => {
                // The item is not valid, then remove it.
                await cache.remove(item);
            });
        }
    }

    /**
     * Finds and returns a cached route and its parameters based on a given URL.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {string} url A string representing the request URL after has been cleaned from GET parameters.
     *
     * @returns {Promise<({route: BaseRoute, parameters: {string: string}}|null)>} An object representing containing both the route and its parameters, if no route is found, null will be returned instead.
     *
     * @private
     */
    async _resolveFromCache(request, url){
        request.cachedRouteLookupTime = process.hrtime();
        // Check if cache is enabled and a provider has been defined, then get it.
        const cache = this._getCacheProviderObject();
        if ( cache === null ){
            return null;
        }
        // Get the server ID used to compute the cached item key.
        const serverID = request.server.getID();
        let routeData = await cache.get(serverID + ':' + url, {
            silent: true
        });
        if ( routeData !== null ){
            // Check if the item is found and if it's a valid cached route.
            if ( typeof routeData !== 'object' || !routeData.hasOwnProperty('routeID') || routeData.routeID === '' || typeof routeData.routeID !== 'string' ){
                this._dropCacheItem(serverID + ':' + url);
                routeData = null;
            }else{
                // Get the route object based on the ID found.
                routeData.route = BaseRoute.findByID(routeData.routeID);
                if ( routeData.route === null ){
                    this._dropCacheItem(serverID + ':' + url);
                    routeData = null;
                }else{
                    routeData.resource = routeData.route instanceof ResourceRoute;
                    if ( routeData.resource && ( !routeData.hasOwnProperty('path') || routeData.path === '' || typeof routeData.path !== 'string' ) ){
                        this._dropCacheItem(serverID + ':' + url);
                        routeData = null;
                    }else{
                        if ( !routeData.hasOwnProperty('parameters') || typeof routeData.parameters !== 'object' ){
                            routeData.parameters = null;
                            routeData.parametersCount = 0;
                        }
                    }
                }
            }
        }
        request.cachedRouteLookupTime = process.hrtime(request.cachedRouteLookupTime);
        request.cachedRouteLookupTime = ( request.cachedRouteLookupTime[0] * 1000 ) + ( request.cachedRouteLookupTime[1] / 1000000 );
        return routeData;
    }

    /**
     *
     *
     * @param {string} key
     * @param {object} routeData
     * @param {string} routerID
     *
     * @returns {boolean}
     *
     * @private
     */
    _saveToCache(key, routeData, routerID){
        const cache = this._getCacheProviderObject();
        if ( cache === null ){
            return false;
        }
        setImmediate(async () => {
            await cache.set(key, {
                routeID: routeData.route.getID(),
                parameters: routeData.parameters,
                parametersCount: routeData.parametersCount
            });
        });
        return true;
    }

    /**
     * Analyzes the request URL and find the route that corresponds the most.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     *
     * @returns {Promise<(BaseRoute|null)>} An instance of the class representing the route, that must extend the "BaseRoute" class, or null if no route is found.
     *
     * @throws {InvalidArgumentException} If an invalid request object is given.
     * @throws {InvalidArgumentException} If no HTTP method name is found within the request object given.
     * @throws {InvalidArgumentException} If no URL is found within the request object given.
     * @throws {MethodNotAllowedHTTPException} If request method is not a supported HTTP method.
     *
     * @async
     */
     async resolve(request){
        if ( request === null || typeof request !== 'object' ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        if ( request.method === '' || typeof request.method !== 'string' ){
            throw new InvalidArgumentException('Invalid request object: no HTTP method found.', 2);
        }
        if ( request.url === '' || typeof request.url !== 'string' ){
            throw new InvalidArgumentException('Invalid request object: no URL found', 3);
        }
        request.routingTime = request.cachedRouteLookupTime = request.routeParamsProcessingTime = 0;
        request.routeFromCache = request.routeCached = false;
        const method = request.method.toUpperCase();
        if ( !BaseRoute.isSupportedMethod(method) ){
            throw new MethodNotAllowedHTTPException('This method is not supported by routing engine.', 4);
        }
        // Clean out the GET parameters.
        const query = request.url.indexOf('?');
        const url = query === -1 ? request.url : request.url.substr(0, query);
        let routeFound = null, matchesFound = null, routerFound = null, routeBuffer = null, matchesBuffer = null, routerBuffer = null, pathFound = null;
        // Check if the same request has been cached.
        const routeData = await this._resolveFromCache(request, url);
        if ( routeData !== null ){
            request.routeFromCache = true;
            return routeData;
        }
        request.routingTime = process.hrtime();
        const routerData = [];
        // Get all the defined routers as an array.
        const routers = this._routers.size === 0 ? [] : Array.from(this._routers);
        const routersCount = routers.length;
        if ( method === 'GET' ){
            // Resource routes require the HTTP request to be done using the GET method.
            for ( let i = 0 ; i < routersCount ; i++ ){
                // Prepare all the routes registered within current router and the prefix that has been defined for current router, they will be reused in next stage.
                routerData[i] = {
                    routes: routers[i].getRoutesSet(),
                    prefix: routers[i].getPrefix()
                };
                if ( typeof routerData[i].prefix !== 'string' || url.indexOf(routerData[i].prefix) === 0 ){
                    // Remove the prefix defined from the original URL, if present.
                    routerData[i].relativeURL = typeof routerData[i].prefix === 'string' ? url.substr(routerData[i].prefix.length) : url;
                    for ( const route of routerData[i].routes ){
                        if ( route instanceof ResourceRoute ){
                            // Process only the resource routes in current stage.
                            if ( routerData[i].relativeURL.indexOf(route.getPath()) === 0 ){
                                // Resource routes require the URL to start by the route path, then, the remaining part, defines the path to the requested file.
                                routeFound = route;
                                routerFound = i;
                                const base = route.getPath();
                                pathFound = routerData[i].relativeURL.substr(base.length);
                                return {
                                    route: routeFound,
                                    path: pathFound,
                                    resource: true
                                };
                            }
                        }
                    }
                }
            }
        }
        for ( let i = 0 ; i < routersCount ; i++ ){
            if ( typeof routerData[i].prefix !== 'string' || url.indexOf(routerData[i].prefix) === 0 ){
                for ( const route of routerData[i].routes ){
                    if ( !( route instanceof ResourceRoute ) ){
                        // Process al the other routes.
                        const routeMethod = route.getMethod();
                        if ( routeMethod === method || ( routeMethod === '*' && routeBuffer === null ) ){
                            const path = route.getPath();
                            const isRegex = route.isRegex();
                            const internalRegex = route.getRegex();
                            if ( routeMethod === method ){
                                // This route matches the request method, so
                                if ( !isRegex && internalRegex === null ){
                                    if ( routerData[i].relativeURL === path ){
                                        routeFound = route;
                                        routerFound = i;
                                        break;
                                    }
                                    continue;
                                }
                                matchesFound = ( internalRegex === null ? path : internalRegex ).exec(routerData[i].relativeURL);
                                if ( matchesFound !== null ){
                                    routeFound = route;
                                    routerFound = i;
                                    break;
                                }
                                continue;
                            }
                            if ( !isRegex && internalRegex === null ){
                                if ( routerData[i].relativeURL === path ){
                                    routeBuffer = route;
                                    routerBuffer = i;
                                    break;
                                }
                                continue;
                            }
                            matchesBuffer = ( internalRegex === null ? path : internalRegex ).exec(routerData[i].relativeURL);
                            if ( matchesBuffer !== null ){
                                routeBuffer = route;
                                routerBuffer = i;
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
            matchesFound = matchesBuffer;
            routerFound = routerBuffer;
        }
        request.routingTime = process.hrtime(request.routingTime);
        request.routingTime = ( request.routingTime[0] * 1000 ) + ( request.routingTime[1] / 1000000 );
        request.routeParamsProcessingTime = process.hrtime();
        // Assign parameters found.
        const placeholders = Array.from(routeFound.getParameters());
        const result = {
            route: routeFound,
            parameters: null,
            resource: false,
            parametersCount: 0
        };
        if ( placeholders.length !== 0 ){
            if ( matchesFound === null || matchesFound.length < placeholders.length ){
                return null;
            }
            result.parameters = {};
            for ( let i = 1 ; i < matchesFound.length ; i++ ){
                if ( placeholders[i - 1] !== '' && typeof placeholders[i - 1] === 'string' ){
                    result.parameters[placeholders[i - 1]] = matchesFound[i];
                    result.parametersCount++;
                }
            }
        }
        request.routeParamsProcessingTime = process.hrtime(request.routeParamsProcessingTime);
        request.routeParamsProcessingTime = ( request.routeParamsProcessingTime[0] * 1000 ) + ( request.routeParamsProcessingTime[1] / 1000000 );
        const key = request.server.getID() + ':' + url;
        request.routeCached = routerFound !== null && this._saveToCache(key, result, routers[routerFound].getID());
        return result;
    }
}

module.exports = RouteResolver;