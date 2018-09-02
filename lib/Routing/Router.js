'use strict';

const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');
const NotFoundHttpException = require('../Exceptions/NotFoundHttpException');

let routers = {};
let routes = {};
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
        if ( typeof(routers['web']) === 'object' ){
            return routers['web'];
        }
        routers['web'] = new Router('web');
        return routers['web'];
    }

    /**
     * Handle the given request.
     *
     * @param {object} request An object representing the request originated by the client.
     * @param {object} handler An object representing the handler for the current request.
     *
     * @returns {Promise<void>}
     *
     * @throws NotFoundHttpException If no matching route were found.
     *
     * @static
     * @async
     */
    static async handle(request, handler){
        let method = request.method.toUpperCase();
        let route = null;
        for ( let key in routes ){
            if ( routes[key].method === method && routes[key].route === request.path ){
                route = routes[key];
                break;
            }
            if ( routes[key].method === '*' && routes[key].route === request.path ){
                route = routes[key];
            }
        }
        if ( route === null ){
            throw new NotFoundHttpException('No matching route has been found.', 3);
        }
        // Running middlewares.
        if ( route.middlewares !== null && typeof(route.middlewares) === 'object' ){
            for ( let identifier in route.middlewares ){
                await route.middlewares[identifier].call(this, request, handler);
            }
        }
        let elements = routers[route.type].getMiddlewares();
        for ( let identifier in elements ){
            await elements[identifier].call(this, request, handler);
        }
        for ( let identifier in middlewares ){
            await middlewares[identifier].call(this, request, handler);
        }
        await route.handler.call(this, request, handler);
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
        return typeof(method) === 'string' && ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'HEAD', '*'].indexOf(method) !== -1;
    }

    /**
     * The class constructor.
     *
     * @param {string?} type An optional string containing the router type.
     */
    constructor(type){
        this.type = type;
        this.middlewares = {};
        if ( typeof(routers[type]) !== 'object' ){
            routers[type] = this;
        }
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
        if ( typeof(route) !== 'string' || route === '' ){
            throw new InvalidArgumentException('Invalid route.', 2);
        }
        if ( typeof(handler) !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 3);
        }
        method = method.toUpperCase();
        if ( typeof(routes[method + ':' + route]) === 'object' ){
            throw new InvalidArgumentException('Route already defined.', 4);
        }
        if ( options === null || typeof(options) !== 'object' ){
            options = {};
        }
        routes[method + ':' + route] = {
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
        if ( typeof(method) !== 'string' || method === '' ){
            throw new InvalidArgumentException('Invalid or unsupported HTTP method.', 1);
        }
        if ( typeof(route) !== 'string' || route === '' ){
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
        if ( typeof(identifier) !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof(handler) !== 'function' ){
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
        if ( typeof(identifier) !== 'string' || identifier === '' ){
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
        if ( middlewares === null || typeof(middlewares) !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        for ( let identifier in middlewares ){
            if ( typeof(identifier) === 'string' && identifier !== '' && typeof(middlewares) === 'function' ){
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