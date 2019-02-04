'use strict';

// Including native modules.
const { Buffer } = require('buffer');
const filesystem = require('fs');

// Including Lala's modules.
const Request = require('../Server/Request');
const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');
const NotFoundHttpException = require('../Exceptions/NotFoundHttpException');
const ForbiddenHttpException = require('../Exceptions/ForbiddenHttpException');
const RequestRejectedException = require('../Exceptions/RequestRejectedException');

/**
 * @type {object} _routers An object containing all the defined routes having as key the router type and as value an instance of this class representing the router.
 *
 * @private
 */
let _routers = {};

/**
 * @type {object} _routes An object containing all the defined routes having the route identifier or alias as key and an object representing the route as value.
 *
 * @private
 */
let _routes = {};

/**
 * @type {object} _resources An object containing all the defined routes for static assets stored having the route identifier or alias as key and an object representing the route as value.
 *
 * @private
 */
let _resources = {};

/**
 * @type {object<string, function>} _middlewares An object containing all the globally defined middlewares having as key the middleware identifier and as value the handler function.
 *
 * @private
 */
let _middlewares = {};

/**
 * @type {object} _paramMiddlewares An object containing all the globally defined middlewares used to mutate and handle parameters stored having as key the middleware identifier and as value the handler function.
 *
 * @private
 */
let _paramMiddlewares = {
    handlers: {}, // An object having as key the middleware identifier and as value the handler function.
    params: {} // An object having as key the parameter name and as value a sequential array containing all the identifiers of the middlewares that handles this parameter.
};

/**
 * @type {object} _prefixes An object containing all the defined prefixes for each router having as key the router type as string and as value a string containing the prefix to apply to every defined route.
 *
 * @private
 */
let _prefixes = {};
class Router{
    /**
     * Returns the default router.
     *
     * @returns {Router} An instance of this class representing the default router.
     */
    static getDefaultRouter(){
        // By default, the "web" router is returned, if it doesn't exist, it will be created on-the-fly.
        if ( typeof _routers['web'] === 'object' ){
            return _routers['web'];
        }
        _routers['web'] = new Router('web');
        return _routers['web'];
    }

    /**
     * Returns a router.
     *
     * @param {string} type A string containing the type of the router to return.
     *
     * @return {Router|null} An instance of the class "Router" representing the router found, if no router matching the given type were found will be returned null.
     *
     * @throws InvalidArgumentException If an invalid router type were given.
     */
    static getRouter(type){
        if ( type === '' || typeof type !== 'string' ){
            throw new InvalidArgumentException('Invalid router type.', 1);
        }
        return typeof _routers[type] === 'object' ? _routers[type] : null;
    }

    /**
     * Handle the given request.
     *
     * @param {object} request An object representing the request originated by the client.
     * @param {object} handler An object representing the handler for the current request.
     * @param {object?} options An optional object containing some options that the router should consider while handling the request, for instance, the router type to use.
     *
     * @returns {Promise<void>}
     *
     * @throws NotFoundHttpException If no matching route were found.
     * @throws RequestRejectedException If the request gets rejected by some middleware.
     * @throws RequestRejectedException If the request gets rejected by some param middleware.
     *
     * @async
     */
    static async handle(request, handler, options){
        if ( options || typeof options !== 'object' ){
            options = {};
        }
        // Create the custom request and append the helper functions to the request handler.
        if ( request.original === null || typeof request.original !== 'object' ){
            request = await Request.prepareRequest(request, handler);
        }
        if ( typeof handler.throwHTTPError !== 'function' ){
            Request.prepareHandler(handler);
        }
        // Find the matching route for the given request.
        let route = Router.route(request, options);
        // Throw a 404 if no route were found for the given path or HTTP method.
        if ( route === null ){
            throw new NotFoundHttpException('No matching route has been found.', 1);
        }
        // Running middlewares.
        let result = await Router._runMiddlewares(route, request, handler, options);
        // Check if the request can be processed according to middleware response.
        if ( result ){
            // Execute middlewares for parameters.
            let processedParameters = await Router._runParamMiddlewares(route, request, handler, options);
            if ( processedParameters !== null ){
                // Merge processed parameters with existing ones, parameters obtained from the URL should be available as GET parameters.
                request.query = Object.assign(processedParameters, request.query);
                // If middlewares response is positive, continue processing the request.
                await Router._processRoute(route, request, handler, options);
                return;
            }
            throw new RequestRejectedException('The request has been rejected by param middlewares.', 3);
        }
        throw new RequestRejectedException('The request has been rejected by middlewares.', 2);
    }

    /**
     * Returns the matching route according to the given request data.
     *
     * @param {object} request An object representing the request originated by the client.
     * @param {object?} options An optional object containing some options that the router should consider while handling the request, for instance, the router type to use.
     *
     * @return {object} An object representing the route found, if no route were found, null will be returned instead.
     *
     * @throws InvalidArgumentException If an invalid object representing the request were given.
     * @throws InvalidArgumentException If no HTTP method were found in the given request object.
     * @throws InvalidArgumentException If no URL were found in the given request object.
     */
    static route(request, options){
        if ( request === null || typeof request !== 'object' ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        if ( request.method === '' || typeof request.method !== 'string' ){
            throw new InvalidArgumentException('Invalid request object: no HTTP method found.', 2);
        }
        if ( request.url === '' || typeof request.url !== 'string' ){
            throw new InvalidArgumentException('Invalid request object: no URL found', 3);
        }
        let method = request.method.toUpperCase();
        let url = request.url;
        if ( options || typeof options !== 'object' ){
            options = {};
        }
        // Clean out the GET parameters.
        let query = url.indexOf('?');
        if ( query !== -1 ){
            url = url.substr(0, query);
        }
        let resource = false, routeType = null, found = false, routeKey = null, matches = null;
        // Get the list of allowed routers according to the given option, if the property is not found, all routers will be considered.
        let allowedRouters = Array.isArray(options.routers) && options.routers.length > 0 ? options.routers : null;
        // Checking if the URL is included in a resource route.
        for ( let type in _resources ){
            // If the current router is not allowed according to the given options, skip it.
            if ( !_resources.hasOwnProperty(type) || allowedRouters !== null && allowedRouters.indexOf(type) === -1 ){
                continue;
            }
            // Check if this route type has a prefix defined and then check if the URL starts with that prefix.
            if ( _prefixes[type] !== null && url.indexOf(_prefixes[type]) !== 0 ){
                continue;
            }
            for ( let key in _resources[type] ){
                if ( _resources[type].hasOwnProperty(key) && url.indexOf(key) === 0 ){
                    routeKey = key;
                    routeType = type;
                    resource = true;
                    break;
                }
            }
        }
        if ( routeKey === null ){
            // Loop through all the routers.
            for ( let type in _routes ){
                // If the current router is not allowed according to the given options, skip it.
                if ( !_routes.hasOwnProperty(type) || allowedRouters !== null && allowedRouters.indexOf(type) === -1 ){
                    continue;
                }
                // Check if this route type has a prefix defined and then check if the URL starts with that prefix.
                if ( _prefixes[type] !== null && url.indexOf(_prefixes[type]) !== 0 ){
                    continue;
                }
                // Loop through all the routes defined for the current router.
                for ( let key in _routes[type] ){
                    if ( !_routes[type].hasOwnProperty(key) ){
                        continue;
                    }
                    if ( _routes[type][key].method === method ){
                        // If the route matches both the request method and the URL, use it.
                        if ( typeof _routes[type][key].route === 'string' && _routes[type][key].route === url ){
                            routeKey = key;
                            routeType = type;
                            found = true;
                            break;
                        }
                        // FIXME: Improve this method performance as executing many regex will result in huge performance degradation.
                        matches = _routes[type][key].route.exec(url);
                        if ( matches !== null ){
                            routeKey = key;
                            routeType = type;
                            found = true;
                            break;
                        }
                        continue;
                    }
                    if ( _routes[type][key].method === '*' ){
                        // If a route matching this path valid for every HTTP method is found, keep it as fallback route to use if any other route is found.
                        if ( typeof _routes[type][key].route === 'string' && _routes[type][key].route === url ){
                            routeKey = key;
                            routeType = type;
                            continue;
                        }
                        matches = _routes[type][key].route.exec(url);
                        if ( matches !== null ){
                            routeKey = key;
                            routeType = type;
                        }
                    }
                }
                if ( found ){
                    break;
                }
            }
        }
        if ( routeKey === null ){
            return null;
        }
        // Append the additional information to the route found, generate a clone of the object in order to avoid to change the original object.
        let processedRoute = resource ? {
            method: _resources[routeType][routeKey].method,
            options: Object.assign({}, _resources[routeType][routeKey].options),
            type: routeType,
            route: _resources[routeType][routeKey].route,
            location: _resources[routeType][routeKey].location,
            path: _resources[routeType][routeKey].path
        } : {
            method: _routes[routeType][routeKey].method,
            options: Object.assign({}, _routes[routeType][routeKey].options),
            type: routeType,
            handler: _routes[routeType][routeKey].handler,
            route: _routes[routeType][routeKey].route,
            location: null,
            parameters: {},
            hasParameters: ( matches !== null && matches.length > 1 ),
            optionalParameters: {}
        };
        // Assign parameters found.
        if ( processedRoute.hasParameters === true ){
            for ( let i = 1 ; i < matches.length ; i++ ){
                let name = _routes[routeType][routeKey].parameters[i - 1];
                if ( name !== '' && typeof name === 'string' ){
                    processedRoute.parameters[name] = matches[i];
                }
            }
        }
        return processedRoute;
    }

    /**
     * Executes all middleware functions defined globally, for the router type the given route belongs to and the middlewares defined for the given route itself.
     *
     * @param {object} route An object representing the route to process and its properties.
     * @param {object} request An object representing the request originated by the client.
     * @param {object} handler An object representing the handler for the current request.
     * @param {object?} options An optional object containing some options that the router should consider while handling the request, for instance, the router type to use.
     *
     * @return {Promise<boolean>} If the request can be processed and completed will be returned "true", otherwise "false".
     *
     * @async
     * @private
     */
    static async _runMiddlewares(route, request, handler, options){
        // Load all middlewares into a single array for a better iteration during execution.
        let elements = Array.of(Router.getGlobalMiddlewares(), _routers[route.type].getMiddlewares());
        elements[2] = route.options.middlewares !== null && typeof route.options.middlewares === 'object' ? route.options.middlewares : {};
        // TODO: Validate middlewares from options.
        let scope = 0, identifiers = [], first = null, index = 0, result = false;
        // Defining the function that will handle next middlewares in middleware implementations.
        let next = async (_request = request, _handler = handler) => {
            let identifier = null;
            // Check if the next middleware still exists, otherwise fetch another one to execute.
            while ( identifier === null && typeof identifier !== 'undefined' ){
                index++;
                // Get the identifier of the next middleware function to execute.
                identifier = identifiers[scope][index];
                // Check if the current middleware group contains another entry.
                if ( typeof identifier === 'undefined' ){
                    // If no other entry were found in the current group, move on the next one.
                    scope++;
                    index = 0;
                    identifier = null;
                    if ( scope >= 3 ){
                        // If all the groups have been scanned, middleware execution has completed.
                        break;
                    }
                    continue;
                }
                if ( elements[scope].hasOwnProperty(identifier) && typeof elements[scope][identifier] === 'function' ){
                    break;
                }
                identifier = null;
            }
            if ( identifier === null || typeof identifier === 'undefined' ){
                // No more middleware function to execute, the original request can be processed.
                result = true;
                return;
            }
            await elements[scope][identifier](_request, _handler, next);
        };
        // Extract all middleware identifiers for better navigation, then find the the fist one to invoke.
        for ( let i = 0 ; i < elements.length ; i++ ){
            identifiers[i] = Object.keys(elements[i]);
            if ( first === null ){
                // If no first element has been designed yet, loop thought all the available middlewares in the current type to pick the first one.
                for ( let n = 0 ; n < identifiers[i].length ; n++ ){
                    if ( elements[i].hasOwnProperty(identifiers[i][n]) && typeof elements[i][identifiers[i][n]] === 'function' ){
                        // If this middleware exists and is a valid function, pick it as first middleware to execute.
                        first = elements[i][identifiers[i][n]];
                        scope = i;
                        index = n;
                        break;
                    }
                }
            }
        }
        // If no middleware is going to be executed the request can be processed.
        if ( first === null ){
            return true;
        }
        // Execute the first middleware found, next ones will be executed by invoking the function "next".
        await first(request, handler, next);
        return result;
    }

    /**
     * Executes all middleware functions used to mutate or interact with request parameters defined globally, at router level and for the current route.
     *
     * @param {object} route An object representing the route to process and its properties.
     * @param {object} request An object representing the request originated by the client.
     * @param {object} handler An object representing the handler for the current request.
     * @param {object?} options An optional object containing some options that the router should consider while handling the request, for instance, the router type to use.
     *
     * @return {Promise<object>} If the request can be processed and completed will be returned "true", otherwise "false".
     *
     * @async
     * @private
     */
    static async _runParamMiddlewares(route, request, handler, options){
        let empty = true;
        // Check if the given route has at least one parameter.
        if ( route.parameters !== null && typeof route.parameters === 'object' ){
            for ( let param in route.parameters ){
                if ( route.parameters.hasOwnProperty(param) ){
                    empty = false;
                    break;
                }
            }
        }
        // If no parameter were found in the given route return "true" as no middleware is going to be executed.
        if ( empty ){
            return {};
        }
        // Load all middlewares into a single array for a better iteration during execution.
        let elements = Array.of(_paramMiddlewares, _routers[route.type].paramMiddlewares);
        // TODO: elements[2] = route.options.paramMiddlewares !== null && typeof route.options.paramMiddlewares === 'object' ? route.options.paramMiddlewares : {};
        // TODO: Validate middlewares from options.
        let scope = 0, identifiers = [], first = null, index = 0, result = null;
        let parameters = Object.assign({}, route.parameters);
        let parameterKeys = Object.keys(parameters);
        // Defining the function that will handle next middlewares in middleware implementations.
        let next = async (_parameters = parameters, _request = request, _handler = handler) => {
            let identifier = null;
            // Check if the next middleware still exists, otherwise fetch another one to execute.
            while ( identifier === null && typeof identifier !== 'undefined' ){
                index++;
                // Get the identifier of the next middleware function to execute.
                identifier = identifiers[scope][index];
                // Check if the current middleware group contains another entry.
                if ( typeof identifier === 'undefined' ){
                    // If no other entry were found in the current group, move on the next one.
                    scope++;
                    index = 0;
                    identifier = null;
                    // FIXME: Move this value to 3 once TODOs in this method have been solved.
                    if ( scope >= 2 ){
                        // If all the groups have been scanned, middleware execution has completed.
                        break;
                    }
                    continue;
                }
                if ( elements[scope].hasOwnProperty(identifier) && typeof elements[scope][identifier] === 'function' ){
                    break;
                }
                identifier = null;
            }
            if ( identifier === null || typeof identifier === 'undefined' ){
                // No more middleware function to execute, the original request can be processed.
                result = _parameters;
                return;
            }
            await elements[scope].handlers[identifier].handler(this, _parameters, _request, _handler, next);
        };
        // Extract all middleware identifiers for better navigation, then find the the fist one to invoke.
        for ( let i = 0 ; i < elements.length ; i++ ){
            // Using a Set in order to ensure middleware uniqueness.
            identifiers[i] = new Set();
            // Checking for each parameter if there are middlewares to handle it.
            parameterKeys.forEach((param) => {
                if ( elements[i].params.hasOwnProperty(param) && elements[i].params[param].length > 0 ){
                    // Load all the middlewares for this parameter.
                    elements[i].params[param].forEach((identifier) => {
                        identifiers[i].add(identifier);
                    });
                }
            });
            // Load all the middleware declared to handle all parameters.
            if ( elements[i].params.hasOwnProperty('*') && elements[i].params['*'].length > 0 ){
                elements[i].params['*'].forEach((identifier) => {
                    identifiers[i].add(identifier);
                });
            }
            // Convert the Set used to ensure middleware uniqueness into a standard array.
            identifiers[i] = Array.from(identifiers[i]);
            if ( first === null ){
                // If no first element has been designed yet, loop thought all the available middlewares in the current type to pick the first one.
                for ( let n = 0 ; n < identifiers[i].length ; n++ ){
                    if ( elements[i].handlers.hasOwnProperty(identifiers[i][n]) && typeof elements[i].handlers[identifiers[i][n]].handler === 'function' ){
                        // If this middleware exists and is a valid function, pick it as first middleware to execute.
                        first = elements[i].handlers[identifiers[i][n]].handler;
                        scope = i;
                        index = n;
                        break;
                    }
                }
            }
        }
        // If no middleware is going to be executed the request can be processed.
        if ( first === null ){
            return parameters;
        }
        // Execute the first middleware found, next ones will be executed by invoking the function "next".
        await first(parameters, request, handler, next);
        return result;
    }

    /**
     * Executes the handler defined for the given route or returns to the client the file if the given route is a resource one.
     *
     * @param {object} route An object representing the route to process and its properties.
     * @param {object} request An object representing the request originated by the client.
     * @param {object} handler An object representing the handler for the current request.
     * @param {object?} options An optional object containing some options that the router should consider while handling the request, for instance, the router type to use.
     *
     * @return {Promise<void>}
     *
     * @async
     * @private
     */
    static async _processRoute(route, request, handler, options){
        if ( options || typeof options !== 'object' ){
            options = {};
        }
        if ( route.location !== '' && typeof route.location === 'string' ){
            // We are going to handle a resource route, we have to serving a file instead of invoking a callback.
            let url = request.url;
            // Clean out the GET parameters.
            let query = url.indexOf('?');
            if ( query !== -1 ){
                url = url.substr(0, query);
            }
            // Rewrite the requested file path with the location defined in the route, basically replace the starting part removing the original path and replacing it with the route's location.
            let path = url.substr(route.path.length);
            path = route.location + path;
            let stat = null;
            try{
                // Get information about the requested file.
                stat = filesystem.lstatSync(path);
            }catch(ex){
                if ( ex.errno === -2 ){
                    throw new NotFoundHttpException('File not found.', 1);
                }
                return;
            }
            if ( !stat.isFile() ){
                if ( stat.isSymbolicLink() ){
                    // If the file is a symlink, it must be followed and returned.
                    // TODO: Get original file.
                }else if ( stat.isDirectory() ){
                    // TODO: If allowed by configuration or option, list directory content, otherwise throw a 403 error.
                    throw new ForbiddenHttpException('Directory listing is not allowed.', 2);
                }
            }
            // TODO: Set headers (mainly MIME type and caching options).
            handler.writeHead(200);
            // Deliver the requested file as stream, reading it chunk by chunk.
            // TODO: Add support for chunk size option in both server and router.
            let stream = filesystem.createReadStream(path, {
                flags: 'r'
            });
            stream.pipe(handler);
            // What for the stream to be sent to the client to close the connection.
            await (new Promise((resolve, reject) => {
                stream.on('end', () => {
                    handler.end();
                    resolve();
                });
            }));
            return;
        }
        // Invoking the route's handler.
        let response = await route.handler.call(this, request, handler);
        if ( typeof response === 'object' ){
            if ( response.constructor.name === 'View' ){
                // If the response is a View instance, call the "print" method in order to render it and send the output to the client.
                await response.print(handler);
                return;
            }
            // If the response is another kind of object, serialize it as JSON string.
            try{
                response = JSON.stringify(response);
                handler.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(response)
                });
                handler.write(response);
                handler.end();
                return;
            }catch(ex){
                //TODO
            }
        }
        // TODO: Add support for default MIME type, for now, using HTML.
        response = response === null || typeof response === 'undefined' ? '' : response.toString();
        handler.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': Buffer.byteLength(response)
        });
        handler.write(response);
        handler.end();
    }

    /**
     * Returns if the given HTTP method is supported by the router.
     *
     * @param {string} method A string containing the method name.
     *
     * @returns {boolean} If the given method is supported will be returned "true", otherwise "false".
     */
    static isSupportedMethod(method){
        method = method.toUpperCase();
        return typeof method === 'string' && Array.of('GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'HEAD', 'SEARCH', '*').indexOf(method) !== -1;
    }

    /**
     * The class constructor.
     *
     * @param {string?} type An optional string containing the router type, by default "web" is used.
     */
    constructor(type){
        if ( type === '' || typeof type !== 'string' ){
            type = 'web';
        }
        if ( typeof _routers[type] === 'object' ){
            return _routers[type];
        }
        this.type = type;
        this.middlewares = {};
        this.paramMiddlewares = {
            handlers: {}, // An object having as key the middleware identifier and as value the handler function.
            params: {} // An object having as key the parameter name and as value a sequential array containing all the identifiers of the middlewares that handles this parameter.
        };
        this.prefix = null;
        this.authenticator = null;
        this.auth = false;
        _routes[type] = {};
        _resources[type] = {};
        _routers[type] = this;
        _prefixes[type] = null;
    }

    /**
     * Returns the type of this router.
     *
     * @return {string} A string containing the this router type.
     */
    getType(){
        return this.type;
    }

    /**
     * Sets the prefix to apply to all the routes of this class, this method is chainable.
     *
     * @param {string|null} prefix A string representing the prefix, if set to null, no prefix will be used.
     *
     * @return {Router}
     *
     * @throws InvalidArgumentException If an invalid prefix were given.
     */
    setPrefix(prefix = null){
        if ( prefix === null ){
            this.prefix = null;
            _prefixes[this.type] = null;
            return this;
        }
        if ( prefix === '' || typeof prefix !== 'string' ){
            throw new InvalidArgumentException('Invalid prefix.', 1);
        }
        // Prefix must start with "/".
        this.prefix = prefix.charAt(0) !== '/' ? ( '/' + prefix ) : prefix;
        _prefixes[this.type] = this.prefix;
        return this;
    }

    /**
     * Returns the prefix to apply to all the routes of this class.
     *
     * @return {string|null} A string representing the prefix, if no prefix has been defined, will be returned null instead.
     */
    getPrefix(){
        return this.prefix;
    }

    /**
     * Add a new route, this method is chainable.
     *
     * @param {string} method A string containing the HTTP method to handle, use "*" to make the route available despite the method.
     * @param {string|array|RegExp} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {function} handler The function invoked to handle this request.
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given method is not supported.
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
     */
    addRoute(method, route, handler, options){
        if ( Router.isSupportedMethod(method) === false ){
            throw new InvalidArgumentException('Invalid or unsupported HTTP method.', 1);
        }
        // Checking if the given route is a single string.
        if ( typeof route !== 'string' || route === '' ){
            // Checking if the given route is a regex.
            if ( route === null || typeof route !== 'object' || route.constructor.name !== 'RegExp' ){
                // Checking if multiple routes have been passed.
                if ( !Array.isArray(route) || route.length === 0 ){
                    throw new InvalidArgumentException('Invalid route.', 2);
                }
            }else{
                route = Array.of(route);
            }
        }else{
            route = Array.of(route);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 3);
        }
        method = method.toUpperCase();
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        route.forEach((element) => {
            // Checking if the current route is regex rather than a string.
            let regex = element !== null && typeof element === 'object' && element.constructor.name === 'RegExp';
            if ( regex || ( typeof element === 'string' && element !== '' ) ){
                // Generating an identifier string for the current route.
                let identifier = regex ? ( method + ':' + element.toString() ) : ( method + ':' + element );
                // Checking if this route has already been defined.
                if ( typeof _routes[this.type][identifier] === 'object' ){
                    throw new InvalidArgumentException('Route "' + element + '" already defined.', 4);
                }
                let route = {
                    method: method,
                    options: options,
                    type: this.type,
                    handler: handler,
                    parameters: [],
                    optionalParameters: []
                };
                if ( typeof element === 'string' ){
                    // Extracting parameters and generating the regex for the route.
                    let components = Router._prepareRoutePath(element, options);
                    if ( components !== null ){
                        route.route = components.path;
                        route.parameters = components.parameters;
                        route.optionalParameters = components.optionalParameters;
                        _routes[this.type][identifier] = route;
                    }
                    return;
                }
                // TODO: Currently parameters are not supported whenever using a regular expression rather than a string for routing path.
                route.route = element;
                _routes[this.type][identifier] = route;
            }
        });
        return this;
    }

    /**
     * Generates the regular expression used to match the given route.
     *
     * @param {string} path A string containing the route path.
     * @param {object} options An object containing the additional configuration options passed with this route.
     *
     * @return {object} An object containing both the generated regular expression and the parameters found.
     *
     * @private
     */
    static _prepareRoutePath(path, options){
        if ( path === '' || typeof path  !== 'string' ){
            return null;
        }
        let components = path.split('/');
        let parameters = [], optionalParameters = [];
        let filtered = options !== null && typeof options === 'object' && options.filters !== null && typeof options.filters === 'object';
        components = components.map((component) => {
            let head = component.substr(0, 2);
            if ( head === ':?' ){
                // An optional parameter has been found.
                // TODO: Add support for optional parameters.
            }else if ( head.charAt(0) === ':' ){
                // A required parameter has been found.
                let name = component.substr(1);
                // Adding the parameter name to the list off all the parameter accepted by this route.
                parameters.push(name);
                // Replacing the parameter with the capturing group for the final regex.
                if ( filtered && options.filters[name] !== '' && typeof options.filters[name] === 'string' ){
                    // Filtering out characters like "/", "\/", "(", ")", "\(" and "/)" from the given filtering regular expression.
                    let regex = options.filters[name].replace(new RegExp('\\/|\\\\\\/(?!\\\\)|\\(|\\\\\\((?!\\\\)|\\)|\\\\\\)(?!\\\\)', 'g'), '');
                    return '(' + regex + ')';
                }
                return '([a-zA-Z0-9_\.-]+)';
            }
            return component;
        });
        return {
            path: new RegExp('^' + components.join('/') + '$'),
            parameters: parameters,
            optionalParameters: optionalParameters
        };
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
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
     * @param {object?} options An optional object containing the additional options for this route.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given route is not valid.
     * @throws InvalidArgumentException If the given handler is not a valid function.
     * @throws InvalidArgumentException If the given route has already been defined.
     */
    any(route, handler, options){
        this.addRoute('*', route, handler, options);
        return this;
    }

    /**
     * Adds a
     *
     * @param path
     * @param location
     * @param options
     *
     * @return {Router}
     */
    resource(path, location, options){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( location === '' || typeof location !== 'string' ){
            throw new InvalidArgumentException('Invalid location path.', 2);
        }
        if ( typeof _resources[this.type][path] === 'object' ){
            throw new InvalidArgumentException('Route already defined.', 4);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        _resources[this.type][path] = {
            location: location,
            options: options,
            type: this.type,
            path: path
        };
        return this;
    }

    /**
     * Add a middleware to all the routes defined in this router, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     * @throws InvalidArgumentException If the given handler is not valid.
     */
    addMiddleware(identifier, handler){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        this.middlewares[identifier] = handler;
        return this;
    }

    /**
     * Removes a middleware from all the routes defined in this router, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     */
    removeMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        delete this.middlewares[identifier];
        return this;
    }

    /**
     * Drops all the defined middlewares from all the routes defined in this router, this method is chainable.
     *
     * @returns {Router}
     */
    dropMiddlewares(){
        this.middlewares = {};
        return this;
    }

    /**
     * Sets the middleware functions to all the routes defined in this router, this method is chainable.
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If an invalid object were given.
     */
    setMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        this.middlewares = {};
        for ( let identifier in middlewares ){
            if ( typeof identifier === 'string' && identifier !== '' && typeof middlewares === 'function' ){
                this.middlewares[identifier] = middlewares[identifier];
            }
        }
        return this;
    }

    /**
     * Returns all the defined middlewares.
     *
     * @returns {object} An object having as key the middleware identifier as string and as value its handler function.
     */
    getMiddlewares(){
        return this.middlewares;
    }

    /**
     * Add a middleware that will be applied to all the routes.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     * @throws InvalidArgumentException If the given handler is not valid.
     */
    static addGlobalMiddleware(identifier, handler){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        _middlewares[identifier] = handler;
    }

    /**
     * Removes a globally defined middleware.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     */
    static removeGlobalMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        delete _middlewares[identifier];
    }

    /**
     * Drops all the globally defined middlewares.
     */
    static dropGlobalMiddlewares(){
        _middlewares = {};
    }

    /**
     * Sets the middleware functions that will be applied to all the routes.
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @throws InvalidArgumentException If an invalid object were given.
     */
    static setGlobalMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        _middlewares = {};
        for ( let identifier in middlewares ){
            if ( typeof identifier === 'string' && identifier !== '' && typeof middlewares === 'function' ){
                _middlewares[identifier] = middlewares[identifier];
            }
        }
    }

    /**
     * Returns all the globally defined middlewares.
     *
     * @returns {object} An object having as key the middleware identifier as string and as value its handler function.
     */
    static getGlobalMiddlewares(){
        return _middlewares;
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
     * @throws InvalidArgumentException If the given identifier is not valid.
     * @throws InvalidArgumentException If the given handler is not valid.
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
     * @throws InvalidArgumentException If the given identifier is not valid.
     * @throws InvalidArgumentException If the given handler is not valid.
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
            param = typeof param === 'string' && param !== '' ? Array.of(param) : Array.of('*');
        }
        // Get the objects that contains the middlewares according to global level set.
        let reference = _this === null ? _paramMiddlewares : _this.paramMiddlewares;
        reference.handlers[identifier] = {
            handler: handler
        };
        // Save this middleware identifier for each parameter in order to improve lookup during middleware execution.
        reference.handlers[identifier].params = param.filter((parameter) => {
            if ( parameter !== '' && typeof parameter === 'string' ){
                if ( !Array.isArray(reference.params[parameter]) ){
                    reference.params[parameter] = Array.of(identifier);
                    return true;
                }
                if ( reference.params[parameter].indexOf(identifier) === -1 ){
                    reference.params[parameter].push(identifier);
                }
                return true;
            }
            return false;
        });
        // If no eligible parameter has been found, remove the saved middleware as it is not going to handle any parameter.
        if ( reference.handlers[identifier].params.length === 0 ){
            delete reference.handlers[identifier];
        }
    }

    /**
     * Removes a middleware that is invoked to handle request parameters, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {Router}
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     */
    removeParamMiddleware(identifier){
        Router._removeParamMiddleware(identifier, this);
        return this;
    }

    /**
     * Implements both "removeParamMiddleware" and "removeGlobalParamMiddleware" methods.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {Router|null} _this The class context where the given middleware must be removed from, if set to null, the middleware will be removed from the globally defined middlewares available for all the routers.
     *
     * @private
     */
    static _removeParamMiddleware(identifier, _this = null){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        let reference = _this === null ? _paramMiddlewares : _this.paramMiddlewares;
        if ( reference.handlers.hasOwnProperty(identifier) ){
            let parameters = reference.handlers[identifier].params;
            if ( Array.isArray(parameters) && parameters.length > 0 ){
                // Removes all the reference to this middleware.
                parameters.forEach((parameter) => {
                    if ( reference.params.hasOwnProperty(parameter) ){
                        delete reference.params[parameter];
                    }
                })
            }
            delete reference.handlers[identifier];
        }
    }

    /**
     * Drops all the defined middleware functions invoked to handle request parameters, this method is chainable.
     *
     * @returns {Router}
     */
    dropParamMiddlewares(){
        this.paramMiddlewares = {
            handlers: {},
            params: {}
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
     * @throws InvalidArgumentException If an invalid object were given.
     */
    setParamMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        // Remove existing middlewares.
        this.dropParamMiddlewares();
        for ( let identifier in middlewares ){
            if ( !middlewares.hasOwnProperty(identifier) || typeof middlewares[identifier].handler !== 'function' ){
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
        return this.paramMiddlewares.handlers;
    }

    /**
     * Adds a middleware function that will be invoked to handle the given parameters whenever they are present within a given request handled by any router.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     * @param {string|array} param A string containing the name of the parameter to process, by default, all parameters will be considered, use "*" to trigger the middleware for every parameter.
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     * @throws InvalidArgumentException If the given handler is not valid.
     */
    static addGlobalParamMiddleware(identifier, handler, param = '*'){
        Router._addParamMiddleware(identifier, handler, param, null);
    }

    /**
     * Removes a middleware that will be invoked to handle the given parameters in every defined router.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @throws InvalidArgumentException If the given identifier is not valid.
     */
    static removeGlobalParamMiddleware(identifier){
        Router._removeParamMiddleware(identifier, null);
    }

    /**
     * Drops all the defined middleware functions invoked to handle request parameters in every defined router.
     */
    static dropGlobalParamMiddlewares(){
        _paramMiddlewares = {
            handlers: {},
            params: {}
        };
    }

    /**
     * Sets the middleware functions that will be invoked to handle the given parameters whenever they are present within a given request handled by any router.
     *
     * @param {object} middlewares An object having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (the parameters to apply the middleware to).
     *
     * @throws InvalidArgumentException If an invalid object were given.
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

    getRoutes(){
        // TODO
    }

    /**
     * Sets the authenticator to use in order to authenticate requests handled by this router, this method is chainable.
     *
     * @param {object|Authenticator|null} authenticator An instance of the authenticator class, the class must extend the "Authenticator" class.
     *
     * @return {Router}
     *
     * @throws InvalidArgumentException If an invalid authenticator were given.
     */
    setAuthenticator(authenticator){
        if ( authenticator === null ){
            this.authenticator = null;
            this.auth = false;
            return this;
        }
        if ( typeof authenticator !== 'object' || Object.getPrototypeOf(authenticator.constructor).name !== 'Authenticator' ){
            throw new InvalidArgumentException('Invalid authenticator object.', 1);
        }
        this.authenticator = authenticator;
        this.auth = true;
        return this;
    }

    /**
     * Returns the authenticator to use in order to authenticate requests handled by this router.
     *
     * @return {object|Authenticator|null} An instance of the authenticator class.
     */
    getAuthenticator(){
        return this.authenticator;
    }

    /**
     * Sets if the requests handled by this router must be authenticated or not, this method is chainable.
     *
     * @param auth If set to true and if an authenticator has been defined, the requests handled by this router will be authenticated, otherwise not.
     *
     * @return {Router}
     */
    setAuth(auth){
        this.auth = auth === true;
        return this;
    }

    /**
     * Returns if the requests handled by this router must be authenticated or not.
     *
     * @return {boolean} If the requests are going to be authenticated will be returned "true", otherwise "false".
     */
    getAuth(){
        return this.auth;
    }
}

module.exports = Router;
