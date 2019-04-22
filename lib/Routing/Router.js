'use strict';

// Including Lala's modules.
const Route = require('./Route');
const ResourceRoute = require('./ResourceRoute');
const ViewRoute = require('./ViewRoute');
const BaseRoute = require('./BaseRoute');
const View = require('../View/View');
const { generateUUID } = require('../helpers');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @type {Map<string, function>} _middlewares A map containing all the globally defined middlewares having as key the middleware identifier and as value the handler function.
 *
 * @private
 */
let _middlewares = new Map();

/**
 * @type {{
 *      handlers: Map<string, function>,
 *      params: Map<string, Set<string>>
 * }} _paramMiddlewares An object containing all the globally defined middlewares used to mutate and handle parameters stored having as key the middleware identifier and as value the handler function.
 *
 * @private
 */
let _paramMiddlewares = {
    handlers: new Map(), // An object having as key the middleware identifier and as value the handler function.
    params: new Map() // An object having as key the parameter name and as value a sequential array containing all the identifiers of the middlewares that handles this parameter.
};

/**
 *
 */
class Router {
    /**
     * Add a middleware that will be applied to all the routes.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     */
    static addGlobalMiddleware(identifier, handler){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        _middlewares.set(identifier, handler);
    }

    /**
     * Removes a globally defined middleware.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    static removeGlobalMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        _middlewares.delete(identifier);
    }

    /**
     * Drops all the globally defined middlewares.
     */
    static dropGlobalMiddlewares(){
        _middlewares = new Map();
    }

    /**
     * Sets the middleware functions that will be applied to all the routes.
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    static setGlobalMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        _middlewares = new Map();
        for ( const id in middlewares ){
            if ( middlewares.hasOwnProperty(id) && typeof id === 'string' && id !== '' && typeof middlewares === 'function' ){
                _middlewares.set(id, middlewares[id]);
            }
        }
    }

    /**
     * Returns all the globally defined middlewares.
     *
     * @returns {Map<string, function>} A map having as key the middleware identifier as string and as value its handler function.
     */
    static getGlobalMiddlewares(){
        return _middlewares;
    }

    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {string} _prefix A string containing an optional prefix to prepend to each route path.
         *
         * @private
         */
        this._prefix = '';

        /**
         * @type {Map<string, function>} _middlewares A map containing having as key an unique identifier and as value a callback function to execute before running a triggered route.
         *
         * @private
         */
        this._middlewares = new Map();

        /**
         * @type {Set<BaseRoute>} _routes A set containing all the defined routes as instances of classes extending the "BaseRoute" class.
         *
         * @private
         */
        this._routes = new Set();

        /**
         * @type {(Authenticator|null)} _authenticator An instance of the class that handles the authentication process, it must extend the "Authenticator" class, if set to null, no authentication will be performed.
         *
         * @private
         */
        this._authenticator = null;

        /**
         * @type {boolean} _auth If set to "true" and if an authenticator class has been defined, authentication will be required in order to access to all the routes defined in this router instance.
         *
         * @private
         */
        this._auth = false;

        /**
         * @type {string} _id A string containing an unique ID for this router used for caching purposes, the ID is a string representation of an UUID version 4.
         *
         * @private
         */
        this._id = generateUUID(4, false);

        /**
         * @type {{
         *      handlers: Map<string, function>,
         *      params: Map<string, Set<string>>
         * }} _paramMiddlewares An object containing all the globally defined middlewares used to mutate and handle parameters stored having as key the middleware identifier and as value the handler function.
         *
         * @private
         */
        this._paramMiddlewares = {
            handlers: new Map(), // An object having as key the middleware identifier and as value the handler function.
            params: new Map() // An object having as key the parameter name and as value a sequential array containing all the identifiers of the middlewares that handles this parameter.
        };
    }

    /**
     * Returns the unique ID of this router.
     *
     * @returns {string} A string representation of this router ID, an UUID version 4.
     */
    getID(){
        return this._id;
    }

    /**
     * Sets the prefix to apply to all the routes of this class, this method is chainable.
     *
     * @param {(string|null)} [prefix=null] A string representing the prefix, if set to null, no prefix will be used.
     *
     * @return {Router}
     *
     * @throws {InvalidArgumentException} If an invalid prefix were given.
     */
    setPrefix(prefix = null){
        if ( prefix !== null && typeof prefix !== 'string' ){
            throw new InvalidArgumentException('Invalid prefix.', 1);
        }
        // Prefix must start with "/".
        this._prefix = prefix === null ? '' : ( prefix.charAt(0) !== '/' ? ( '/' + prefix ) : prefix );
        return this;
    }

    /**
     * Returns the prefix to apply to all the routes of this class.
     *
     * @return {(string|null)} A string representing the prefix, if no prefix has been defined, will be returned null instead.
     */
    getPrefix(){
        return this._prefix === '' ? null : this._prefix;
    }

    /**
     * Add a new route, this method is chainable.
     *
     * @param {string} method A string containing the HTTP method to handle, use "*" to make the route available despite the method.
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @param {{string: function}} [options.middlewares] An object containing the middleware functions to execute before invoking the function handler.
     * @param {(Authenticator|null)} [options.authenticator] An instance of the authenticator class, it must extends the "Authenticator" class, if set to null, no authentication will be required.
     * @param {(string|null)} [options.name] A string containing an unique name for this route.
     * @param {boolean} [options.auth] If set to "true" it means that user authentication is required in order to access to this route.
     * @param {{string: string|RegExp}} [options.filters] An object having as value a string or a regex containing the condition to apply to the corresponding parameter used as item key.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given method is not supported.
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    addRoute(method, route, handler, options){
        if ( BaseRoute.isSupportedMethod(method) === false ){
            throw new InvalidArgumentException('Invalid or unsupported HTTP method.', 1);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {
                middlewares: {},
                authenticator: null,
                name: null,
                auth: null,
                filters: null
            };
        }
        const routes = Array.isArray(route) ? route : Array.of(route);
        const length = routes.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Generate and configure the route object.
            const routeObject = new Route(method, routes[i], handler);
            if ( options.middlewares !== null && typeof options.middlewares === 'object' ){
                routeObject.setMiddlewares(options.middlewares);
            }
            if ( options.authenticator !== null && typeof options.authenticator === 'object' ){
                routeObject.setAuthenticator(options.authenticator);
            }
            if ( options.name !== '' && typeof options.name === 'string' ){
                routeObject.setName(options.name);
            }
            if ( options.filters !== null && typeof options.filters === 'object' ){
                routeObject.setParameterFilters(options.filters);
            }
            routeObject.setAuth(options.auth);
            this._routes.add(routeObject);
        }
        return this;
    }

    /**
     * Adds a route as an instance of a class representing it, this method is chainable.
     *
     * @param {BaseRoute} route An instance of the class implementing the route, it must extend the "BaseRoute" class.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If an invalid route object is given.
     */
    addRouteObject(route){
        if ( route ){
            throw new InvalidArgumentException('Invalid route object.', 1);
        }
        this._routes.add(route);
        return this;
    }

    /**
     * Removes a router from this router.
     *
     * @param {string} method A string containing the route's HTTP method.
     * @param {string|RegExp} route A string or a regular expression containing the path that the route has been defined with.
     *
     * @returns {Router}
     */
    removeRoute(method, route){
        if ( typeof method !== 'string' || method === '' ){
            throw new InvalidArgumentException('Invalid or unsupported HTTP method.', 1);
        }
        if ( route !== '' && typeof route === 'string' ){
            delete _routes[method + ':' + route];
        }else if ( route !== null && typeof route === 'object' && route.constructor.name === 'RegExp' ){
            delete _routes[method + ':' + route.toString()];
        }else{
            throw new InvalidArgumentException('Invalid route.', 2);
        }
        return this;
    }

    /**
     * Adds a route suitable to handle GET requests, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    get(route, handler, options){
        this.addRoute('GET', route, handler, options);
        return this;
    }

    /**
     * Adds a route suitable to handle POST requests, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    post(route, handler, options){
        this.addRoute('POST', route, handler, options);
        return this;
    }

    /**
     * Adds a route suitable to handle PUT requests, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    put(route, handler, options){
        this.addRoute('PUT', route, handler, options);
        return this;
    }

    /**
     * Adds a route suitable to handle DELETE requests, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    delete(route, handler, options){
        this.addRoute('DELETE', route, handler, options);
        return this;
    }

    /**
     * Adds a route suitable to handle PATCH requests, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    patch(route, handler, options){
        this.addRoute('PATCH', route, handler, options);
        return this;
    }

    /**
     * Adds a route suitable to handle SEARCH requests, note that this is a non-standard HTTP method meant to handle searches acting like a GET request, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    search(route, handler, options){
        this.addRoute('SEARCH', route, handler, options);
        return this;
    }

    /**
     * Adds a route that can be triggered despite the HTTP method, this method is chainable.
     *
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    any(route, handler, options){
        this.addRoute('*', route, handler, options);
        return this;
    }

    /**
     * Adds a resource route, the ones used to serve static assets to the client, this method is chainable.
     *
     * @param {string} path
     * @param {string} location
     * @param {object} [options] An optional object containing the additional options for this route.
     *
     * @param {{string: function}} [options.middlewares] An object containing the middleware functions to execute before invoking the function handler.
     * @param {(Authenticator|null)} [options.authenticator] An instance of the authenticator class, it must extends the "Authenticator" class, if set to null, no authentication will be required.
     * @param {(string|null)} [options.name] A string containing an unique name for this route.
     * @param {boolean} [options.auth] If set to "true" it means that user authentication is required in order to access to this route.
     *
     * @return {Router}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid location path is given.
     */
    resource(path, location, options){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( location === '' || typeof location !== 'string' ){
            throw new InvalidArgumentException('Invalid location path.', 2);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {
                middlewares: {},
                authenticator: null,
                name: null,
                auth: false
            };
        }
        // Generate and configure the route object.
        const route = new ResourceRoute();
        route.setPath(path).setLocation(location);
        if ( options.middlewares !== null && typeof options.middlewares === 'object' ){
            route.setMiddlewares(options.middlewares);
        }
        if ( options.authenticator !== null && typeof options.authenticator === 'object' ){
            route.setAuthenticator(options.authenticator);
        }
        if ( options.name !== '' && typeof options.name === 'string' ){
            route.setName(options.name);
        }
        route.setAuth(options.auth);
        this._routes.add(route);
        return this;
    }

    /**
     *
     */
    view(route, view, options){
        if ( options === null || typeof options !== 'object' ){
            options = {
                middlewares: {},
                authenticator: null,
                name: null,
                auth: null,
                filters: null,
                data: null
            };
        }
        const routes = Array.isArray(route) ? route : Array.of(route);
        const length = routes.length;
        for ( let i = 0 ; i < length ; i++ ){
            const routeObject = new ViewRoute();
            if ( view instanceof View ){
                routeObject.setView(view);
            }else if ( view !== '' && typeof view === 'string' ){
                routeObject.setViewByPath(view, options.data);
            }else{
                continue;
            }
            if ( options.middlewares !== null && typeof options.middlewares === 'object' ){
                routeObject.setMiddlewares(options.middlewares);
            }
            if ( options.authenticator !== null && typeof options.authenticator === 'object' ){
                routeObject.setAuthenticator(options.authenticator);
            }
            if ( options.name !== '' && typeof options.name === 'string' ){
                routeObject.setName(options.name);
            }
            if ( options.filters !== null && typeof options.filters === 'object' ){
                routeObject.setParameterFilters(options.filters);
            }
            routeObject.setAuth(options.auth).setPath(routes[i]);
            this._routes.add(routeObject);
        }
        return this;
    }

    redirect(){

    }

    /**
     * Add a middleware to all the routes defined in this router, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     */
    addMiddleware(identifier, handler){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        this._middlewares.set(identifier, handler);
        return this;
    }

    /**
     * Removes a middleware from all the routes defined in this router, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    removeMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        this._middlewares.delete(identifier);
        return this;
    }

    /**
     * Drops all the defined middlewares from all the routes defined in this router, this method is chainable.
     *
     * @returns {Router}
     */
    dropMiddlewares(){
        this._middlewares = new Map();
        return this;
    }

    /**
     * Sets the middleware functions to all the routes defined in this router, this method is chainable.
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    setMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        this._middlewares = new Map();
        for ( const id in middlewares ){
            if ( middlewares.hasOwnProperty(id) && typeof id === 'string' && id !== '' && typeof middlewares === 'function' ){
                this._middlewares.set(id, middlewares[id]);
            }
        }
        return this;
    }

    /**
     * Returns all the defined middlewares.
     *
     * @returns {Map<string, function>} A map having as key the middleware identifier as string and as value its handler function.
     */
    getMiddlewares(){
        return this._middlewares;
    }

    /**
     * Adds a middleware function that will be invoked to handle the given parameters when found in a request, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     * @param {string|array} param A string containing the name of the parameter to process, by default, all parameters will be considered, use "*" to trigger the middleware for every parameter.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     */
    addParamMiddleware(identifier, handler, param = '*'){
        Router._addParamMiddleware(identifier, handler, param, this);
        return this;
    }

    /**
     * Implements both "addParamMiddleware" and "addGlobalParamMiddleware" methods.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     * @param {string|array} param A string containing the name of the parameter to process, by default, all parameters will be considered, use "*" to trigger the middleware for every parameter.
     * @param {Router|null} _this The class context where the given middleware must be added to, if set to null, the middleware will be defined globally for all the routers.
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     *
     * @private
     */
    static _addParamMiddleware(identifier, handler, param = '*', _this = null){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        // Transform the given param value into an array.
        if ( !Array.isArray(param) ){
            param = typeof param === 'string' && param !== '' ? [param] : ['*'];
        }
        // Get the objects that contains the middlewares according to global level set.
        const reference = _this === null ? _paramMiddlewares : _this._paramMiddlewares;
        // Creating the object that will represent this middleware.
        const middleware = {
            handler: handler,
            params: new Set()
        };
        // Validating given parameters.
        const length = param.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( param[i] !== '' && typeof param[i] === 'string' ){
                if ( !reference.params.has(param[i]) ){
                    // If no middleware has been previously registered to handle current parameter, then create the set that will contain all the middlewares for this parameter.
                    reference.params.set(param[i], new Set([param[i]]));
                }
                // Attach the reference to this middleware for current parameter.
                reference.params.get(param[i]).add(identifier);
                middleware.params.add(identifier);
            }
        }
        if ( middleware.params.size !== 0 ){
            // If this middleware has been attached to at least one parameter, then register it to the list of all the available middlewares.
            reference.handlers.set(identifier, middleware);
        }
    }

    /**
     * Implements both "removeParamMiddleware" and "removeGlobalParamMiddleware" methods.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {Router|null} _this The class context where the given middleware must be removed from, if set to null, the middleware will be removed from the globally defined middlewares available for all the routers.
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     *
     * @private
     */
    static _removeParamMiddleware(identifier, _this = null){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        // Get the objects that contains the middlewares according to global level set.
        const reference = _this === null ? _paramMiddlewares : _this._paramMiddlewares;
        const middleware = reference.handlers.get(identifier);
        if ( typeof middleware !== 'undefined' ){
            // If given middleware has been registered, then start removing the reference to associated parameters.
            const length = Array.isArray(middleware.params) ? middleware.params.length : 0;
            // Remove all the reference to this middleware in all the parameters supported by this middleware.
            for ( let i = 0 ; i < length ; i++ ){
                reference.handlers.delete(middleware.params[i]);
            }
            reference.handlers.delete(identifier);
        }
    }

    /**
     * Returns all the middlewares declared to be run whenever processing a given parameter.
     *
     * @param {(string|null)} [name=null] A string containing the name of the parameter the middleware that will be returned are referenced to, if null, all middlewares grouped by parameter will be returned.
     * @param {Router|null} _this The class context where the given middleware must be removed from, if set to null, the middleware will be removed from the globally defined middlewares available for all the routers.
     *
     * @returns {({string: function}|{string: {string: function}})} An object having as key the middleware id and as value its handler function, if all middleware are returned, those objects are grouped by parameter name.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     *
     * @private
     */
    static _getParamMiddlewareByParameterName(name = null, _this = null){
        if ( name !== null && ( name === '' || typeof name !== 'string' ) ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        // Get the objects that contains the middlewares according to global level set.
        const reference = _this === null ? _paramMiddlewares : _this._paramMiddlewares;
        if ( name === null ){
            const parameters = {};
            for ( const [key, value] of reference.handlers ){
                // Validate current middleware definition.
                if ( value !== null && typeof value === 'object' && typeof value.handler === 'function' && value.param instanceof Set ){
                    for ( const parameter of value.param ){
                        if ( !parameters.hasOwnProperty(parameter) ){
                            parameters[parameter] = {};
                        }
                        // Add current middleware handler to this parameter's stack.
                        parameters[parameter][key] = value.handler;
                    }
                }
            }
            return parameters;
        }
        const middlewares = {};
        for ( const [key, value] of reference.handlers ){
            // Validate current middleware definition.
            if ( value !== null && typeof value === 'object' && typeof value.handler === 'function' && value.param instanceof Set ){
                for ( const parameter of value.param ){
                    if ( parameter === name ){
                        // As current parameter name is the same of the given one, add current middleware to the list of returned elements.
                        middlewares[key] = value.handler;
                    }
                }
            }
        }
        return middlewares;
    }

    /**
     * Removes a middleware that is invoked to handle request parameters, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    removeParamMiddleware(identifier){
        Router._removeParamMiddleware(identifier, this);
        return this;
    }

    /**
     * Drops all the defined middleware functions invoked to handle request parameters, this method is chainable.
     *
     * @returns {Router}
     */
    dropParamMiddlewares(){
        this._paramMiddlewares = {
            handlers: new Map(),
            params: new Map()
        };
        return this;
    }

    /**
     * Sets the middleware functions that will be invoked to handle the given parameters when found in a request, this method is chainable.
     *
     * @param {object} middlewares An object having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (the parameters to apply the middleware to).
     *
     * @return {Router}
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    setParamMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        // Remove existing middlewares.
        this.dropParamMiddlewares();
        for ( const identifier in middlewares ){
            if ( !middlewares.hasOwnProperty(identifier) ){
                continue;
            }
            // Check if current middleware has all the required properties.
            if ( !middlewares[identifier].hasOwnProperty('handler') || !middlewares[identifier].hasOwnProperty('param') ){
                continue;
            }
            if ( typeof middlewares[identifier].handler !== 'function' ){
                // No handler function defined for this middleware, skipping it.
                continue;
            }
            if ( middlewares[identifier].param !== '' && ( typeof middlewares[identifier].param === 'string' || Array.isArray(middlewares[identifier].param) ) ){
                // Add the middleware if eligible.
                this.addParamMiddleware(identifier, middlewares[identifier].handler, middlewares[identifier].param);
            }
        }
        return this;
    }

    /**
     * Returns the middleware functions that will be invoked to handle the given parameters when found in a request.
     *
     * @return {object} An object having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (an array of strings containing the parameters that the middleware is applied to).
     */
    getParamMiddlewares(){
        return this._paramMiddlewares.handlers;
    }

    /**
     * Returns all the middlewares declared to be run whenever processing a given parameter.
     *
     * @param {(string|null)} [name=null] A string containing the name of the parameter the middleware that will be returned are referenced to, if null, all middlewares grouped by parameter will be returned.
     *
     * @returns {({string: function}|{string: {string: function}})} An object having as key the middleware id and as value its handler function, if all middleware are returned, those objects are grouped by parameter name.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     */
    getParamMiddlewareByParameterName(name = null){
        return Router._getParamMiddlewareByParameterName(name, this);
    }

    /**
     * Adds a middleware function that will be invoked to handle the given parameters whenever they are present within a given request handled by any router.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     * @param {string|array} param A string containing the name of the parameter to process, by default, all parameters will be considered, use "*" to trigger the middleware for every parameter.
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     */
    static addGlobalParamMiddleware(identifier, handler, param = '*'){
        Router._addParamMiddleware(identifier, handler, param, null);
    }

    /**
     * Removes a middleware that will be invoked to handle the given parameters in every defined router.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    static removeGlobalParamMiddleware(identifier){
        Router._removeParamMiddleware(identifier, null);
    }

    /**
     * Drops all the defined middleware functions invoked to handle request parameters in every defined router.
     */
    static dropGlobalParamMiddlewares(){
        _paramMiddlewares = {
            handlers: new Map(),
            params: new Map()
        };
    }

    /**
     * Sets the middleware functions that will be invoked to handle the given parameters whenever they are present within a given request handled by any router.
     *
     * @param {object} middlewares An object having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (the parameters to apply the middleware to).
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    static setGlobalParamMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        // Remove existing middlewares.
        Router.dropGlobalParamMiddlewares();
        for ( let identifier in middlewares ){
            if ( !middlewares.hasOwnProperty(identifier) || typeof middlewares[identifier].handler !== 'function' ){
                continue;
            }
            if ( middlewares[identifier].param !== '' && ( typeof middlewares[identifier].param === 'string' || Array.isArray(middlewares[identifier].param) ) ){
                // Add the middleware if eligible.
                Router.addGlobalParamMiddleware(identifier, middlewares[identifier].handler, middlewares[identifier].param);
            }
        }
    }

    /**
     * Returns the middleware functions that will be invoked to handle the given parameters whenever they are present within a given request handled by any router.
     *
     * @return {object} An object having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (an array of strings containing the parameters that the middleware is applied to).
     */
    static getGlobalParamMiddlewares(){
        return _paramMiddlewares.handlers;
    }

    /**
     * Returns all the middlewares declared globally to be run whenever processing a given parameter.
     *
     * @param {(string|null)} [name=null] A string containing the name of the parameter the middleware that will be returned are referenced to, if null, all middlewares grouped by parameter will be returned.
     *
     * @returns {({string: function}|{string: {string: function}})} An object having as key the middleware id and as value its handler function, if all middleware are returned, those objects are grouped by parameter name.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     */
    static getGlobalParamMiddlewareByParameterName(name = null){
        return Router._getParamMiddlewareByParameterName(name);
    }

    /**
     * Sets the authenticator to use in order to authenticate requests handled by this router, this method is chainable.
     *
     * @param {object|Authenticator|null} authenticator An instance of the authenticator class, the class must extend the "Authenticator" class.
     *
     * @return {Router}
     *
     * @throws {InvalidArgumentException} If an invalid authenticator were given.
     */
    setAuthenticator(authenticator){
        if ( authenticator === null ){
            this._authenticator = null;
            this.auth = false;
            return this;
        }
        if ( typeof authenticator !== 'object' || Object.getPrototypeOf(authenticator.constructor).name !== 'Authenticator' ){
            // TODO: Find out a better system to validate class instances.
            //throw new InvalidArgumentException('Invalid authenticator object.', 1);
        }
        this._authenticator = authenticator;
        this.auth = true;
        return this;
    }

    /**
     * Returns the authenticator to use in order to authenticate requests handled by this router.
     *
     * @return {object|Authenticator|null} An instance of the authenticator class.
     */
    getAuthenticator(){
        return this._authenticator;
    }

    /**
     * Sets if the requests handled by this router must be authenticated or not, this method is chainable.
     *
     * @param auth If set to true and if an authenticator has been defined, the requests handled by this router will be authenticated, otherwise not.
     *
     * @return {Router}
     */
    setAuth(auth){
        this._auth = auth === true;
        return this;
    }

    /**
     * Returns if the requests handled by this router must be authenticated or not.
     *
     * @return {boolean} If the requests are going to be authenticated will be returned "true", otherwise "false".
     */
    getAuth(){
        return this._auth === true;
    }

    /**
     * Returns all the routes that have been defined.
     *
     * @return {BaseRoute[]} A sequential array containing all the routes as instances of classes extending the "BaseRoute" class.
     */
    getRoutes(){
        return Array.from(this._routes);
    }

    /**
     *
     *
     * @returns {Set<BaseRoute>}
     */
    getRoutesSet(){
        return this._routes;
    }
}

module.exports = Router;
