'use strict';

// Including native modules.
const Buffer = require('buffer');
const filesystem = require('fs');

// Including Lala's modules.
const { InvalidArgumentException, NotFoundHttpException } = require('../../index');

/**
 * @type {object} routers An object containing all the defined routes.
 */
let routers = {};
let routes = {};
let resources = {};
let middlewares = {};
class Router{
    /**
     * Returns the default router.
     *
     * @returns {Router} An instance of this class representing the default router.
     *
     * @static
     */
    static getDefaultRouter(){
        // By default, the "web" router is returned, if it doesn't exist, it will be created on-the-fly.
        if ( typeof routers['web'] === 'object' ){
            return routers['web'];
        }
        routers['web'] = new Router('web');
        return routers['web'];
    }

    /**
     * Returns a router.
     *
     * @param {string} type A string containig the type of the router to return.
     *
     * @return {Router|null} An instance of the class "Router" representing the router found, if no router matching the given type were found will be returned null.
     *
     * @throws InvalidArgumentException If an invalid router type were given.
     */
    static getRouter(type){
        if ( type === '' || typeof type !== 'string' ){
            throw new InvalidArgumentException('Invalid router type.', 1);
        }
        return typeof routers[type] === 'object' ? routers[type] : null;
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
     *
     * @static
     * @async
     */
    static async handle(request, handler, options){
        if ( options || typeof options !== 'object' ){
            options = {};
        }
        let method = request.method.toUpperCase();
        let route = null;
        let resource = null;
        let found = false;
        // Get the list of allowed routers according to the given option, if the property is not found, all routers will be considered.
        let allowedRouters = Array.isArray(options.routers) && options.routers.length > 0 ? options.routers : null;
        // Checking if the URL is included in a resource route.
        for ( let type in resources ){
            // If the current router is not allowed according to the given options, skip it.
            if ( !resources.hasOwnProperty(type) || allowedRouters !== null && allowedRouters.indexOf(type) === -1 ){
                continue;
            }
            for ( let key in resources[type] ){
                if ( resources[type].hasOwnProperty(key) && request.url.indexOf(key) === 0 ){
                    route = resources[type][key];
                    resource = key;
                    break;
                }
            }
        }
        if ( route === null ){
            // Loop through all the routers.
            for ( let type in routes ){
                // If the current router is not allowed according to the given options, skip it.
                if ( !routes.hasOwnProperty(type) || allowedRouters !== null && allowedRouters.indexOf(type) === -1 ){
                    continue;
                }
                // Loop through all the routes defined for the current router.
                for ( let key in routes[type] ){
                    if ( !routes[type].hasOwnProperty(key) ){
                        continue;
                    }
                    // If the route matches both the request method and the URL, use it.
                    if ( routes[type][key].method === method && routes[type][key].route === request.url ){
                        route = routes[type][key];
                        found = true;
                        break;
                    }
                    // If a route matching this path valid for every HTTP method is found, keep it as fallback route to use if any other route is found.
                    if ( routes[type][key].method === '*' && routes[type][key].route === request.url ){
                        route = routes[type][key];
                    }
                }
                if ( found ){
                    break;
                }
            }
        }
        // Throw a 404 if no route were found for the given path or HTTP method.
        if ( route === null ){
            throw new NotFoundHttpException('No matching route has been found.', 3);
        }
        // Running middlewares.
        if ( route.middlewares !== null && typeof route.middlewares === 'object' ){
            for ( let identifier in route.middlewares ){
                if ( route.middlewares.hasOwnProperty(identifier) ){
                    await route.middlewares[identifier].call(this, request, handler);
                }
            }
        }
        let elements = routers[route.type].getMiddlewares();
        for ( let identifier in elements ){
            if ( elements.hasOwnProperty(identifier) ){
                await elements[identifier].call(this, request, handler);
            }
        }
        for ( let identifier in middlewares ){
            if ( middlewares.hasOwnProperty(identifier) ){
                await middlewares[identifier].call(this, request, handler);
            }
        }
        if ( resource !== null ){
            // We are going to handle a resource route, we have to serving a file instead of invoking a callback.
            let path = request.url.substr(resource.length);
            path = route.location + path;
            try{
                let stat = filesystem.lstatSync(path);
                if ( !stat.isFile() ){
                    //TODO
                }
                // TODO: Set headers
                handler.writeHead(200);
                handler.write(filesystem.readFileSync(path, 'utf8').toString());
                handler.end();
                return;
            }catch(ex){
                switch ( ex.errno ) {
                    case -2:{
                        throw new NotFoundHttpException('File not found.', 4);
                    }
                    default:{
                        //
                    }break;
                }
                return;
            }
        }
        // Invoking the route's handler.
        let response = await route.handler.call(this, request, handler);
        switch ( typeof response ){
            case 'object':{
                switch ( response.constructor.name ){
                    case 'View':{
                        await response.print(handler);
                    }break;
                    default:{
                        try{
                            response = JSON.stringify(response);
                        }catch(ex){
                            //TODO
                        }
                        handler.writeHead(200, {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(response)
                        });
                        handler.write(response);
                        handler.end();
                    }break;
                }
            }break;
        }
    }

    /**
     * Returns if the given HTTP method is supported by the router.
     *
     * @param {string} method A string containing the method name.
     *
     * @returns {boolean} If the given method is supported will be returned "true", otherwise "false".
     *
     * @static
     */
    static isSupportedMethod(method){
        method = method.toUpperCase();
        return typeof method === 'string' && ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'HEAD', 'SEARCH', '*'].indexOf(method) !== -1;
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
        if ( typeof routers[type] === 'object' ){
            return routers[type];
        }
        this.type = type;
        this.middlewares = {};
        routes[type] = {};
        resources[type] = {};
        routers[type] = this;
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
     * Add a new route, this method is chainable.
     *
     * @param {string} method A string containing the HTTP method to handle, use "*" to make the route available despite the method.
     * @param {string} route A string containing the route pattern.
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
        if ( typeof route !== 'string' || route === '' ){
            throw new InvalidArgumentException('Invalid route.', 2);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 3);
        }
        method = method.toUpperCase();
        if ( typeof routes[this.type][method + ':' + route] === 'object' ){
            throw new InvalidArgumentException('Route already defined.', 4);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        routes[this.type][method + ':' + route] = {
            method: method,
            route: route,
            handler: handler,
            options: options,
            type: this.type
        };
        return this;
    }

    /**
     * Removes a router from this router.
     *
     * @param {string} method A string containing the route's HTTP method.
     * @param {string} route A string containing the route pattern.
     *
     * @returns {Router}
     */
    removeRoute(method, route){
        if ( typeof method !== 'string' || method === '' ){
            throw new InvalidArgumentException('Invalid or unsupported HTTP method.', 1);
        }
        if ( typeof route !== 'string' || route === '' ){
            throw new InvalidArgumentException('Invalid route.', 2);
        }
        delete routes[method + ':' + route];
        return this;
    }

    /**
     * Adds a route suitable to handle GET requests, this method is chainable.
     *
     * @param {string} route A string containing the route pattern.
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
     * @param {string} route A string containing the route pattern.
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
     * @param {string} route A string containing the route pattern.
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
     * @param {string} route A string containing the route pattern.
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
     * @param {string} route A string containing the route pattern.
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
     * @param {string} route A string containing the route pattern.
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
     * @param {string} route A string containing the route pattern.
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
        if ( typeof resources[this.type][path] === 'object' ){
            throw new InvalidArgumentException('Route already defined.', 4);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        resources[this.type][path] = {
            location: location,
            options: options,
            type: this.type
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
    removeMiddlewares(identifier){
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
     * Adds one or more middleware to all the routes defined in this router, this method is chainable.
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
}

module.exports = Router;
