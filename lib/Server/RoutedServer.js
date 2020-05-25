'use strict';

// Including Lala's modules.
const Server = require('./Server');
const Router = require('../Routing/Router');
const ResolvedRoute = require('../Routing/ResolvedRoute');
const BaseRoute = require('../Routing/BaseRoute');
const ParameterizedRoute = require('../Routing/ParameterizedRoute');
const RouteProcessorFactory = require('./processors/factories/RouteProcessorFactory');
const RouterRepository = require('../Routing/RouterRepository');
const {
    RuntimeException,
    InvalidArgumentException,
    ForbiddenHTTPException,
    NotImplementedYetException
} = require('../Exceptions');

/**
 * Implements a basic server providing support for routes.
 *
 * @abstract
 */
class RoutedServer extends Server {
    /**
     * Returns the classes used in processor validation.
     *
     * @returns {Object.<string, function>} An object having as key the processor identifier and as value the processor class.
     */
    getProcessorClasses(){
        return Object.assign(super.getProcessorClasses(), {
            route: RouteProcessorFactory
        });
    }

    /**
     * Resolves the request URL finding the corresponding route.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    async _resolveRequestRoute(request, response){
        // Checking if the request can continue according to interceptors.
        await this._runInterceptors('request.routeResolution', request, response);
        const processor = this._routeProcessorFactory.craft();
        // Find out what route matches the request path.
        await processor.process(request, response);
        this.emit('request.routeResolution', request, response);
    }

    /**
     * Executes all the middlewares for the resolved route and the router that route belongs to.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If current client request can be processed will be returned "true", otherwise "false" if it should be rejected.
     *
     * @async
     * @protected
     */
    async _runMiddlewares(request, response){
        let result = true;
        if ( request.route instanceof BaseRoute ){
            // Execute all the middlewares defined for this route.
            result = await request.route.runMiddlewares(request, response);
            if ( result && request.route instanceof ParameterizedRoute ){
                // Execute all the parameter's middlewares defined for this route.
                result = await request.route.runParamMiddlewares(request, response);
            }
        }else if ( request.resolvedRoute instanceof ResolvedRoute ){
            const router = request.resolvedRoute.getRouter();
            const route = request.resolvedRoute.getRoute();
            // Execute all the middlewares defined for this route.
            result = await route.runMiddlewares(request, response);
            if ( result ){
                // Execute all the middlewares defined for the router this route belongs to.
                result = await router.runMiddlewares(request, response);
                if ( result ){
                    if ( request.route instanceof ParameterizedRoute ){
                        // Execute all the parameter's middlewares defined for this route.
                        result = await route.runParamMiddlewares(request, response);
                    }
                    if ( result ) {
                        // Execute all the parameter's middlewares defined for the router this route belongs to.
                        result = await router.runParamMiddlewares(request, response);
                    }
                }
            }
        }
        return result;
    }

    /**
     * Returns the route that has been found according to request URL or the route that has been set to be processed.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {?BaseRoute} An object representing the route and extending the "BaseRoute" class or null if no route to process has been found.
     *
     * @protected
     */
    _getRoute(request){
        let route = null;
        if ( request.route instanceof BaseRoute ){
            route = request.route;
        }else if ( request.resolvedRoute instanceof ResolvedRoute ){
            route = request.resolvedRoute.getRoute();
        }
        return route;
    }

    /**
     * Executes the handler method of the route that was found while processing current client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @throws {ForbiddenHTTPException} If current client request should be blocked according to executed middlewares.
     *
     * @async
     * @protected
     */
    async _processRoute(request, response){
        // Checking if the request can continue according to interceptors.
        await this._runInterceptors('request.routeProcess', request, response);
        const route = this._getRoute(request);
        if ( route !== null ){
            if ( request.resolvedRoute instanceof ResolvedRoute ){
                // Inject route parameters into the query parameters.
                const parameters = request.resolvedRoute.getParameters();
                request.params = Object.assign(request.params, parameters);
            }
            // Executes all the middleware functions defined for current route and the router this route belongs to in order to check if current request can continue.
            const result = await this._runMiddlewares(request, response);
            if ( !result ){
                // Request should be rejected according to middlewares.
                throw new ForbiddenHTTPException('Request was rejected by middlewares.', 1);
            }
            route.trigger(request, response);
            if ( request.preventRouteExecution !== true ){
                response.rawOutput = await route.execute(request, response);
            }
        }
        this.emit('request.routeProcess', request, response);
    }

    /**
     * Processes a whole client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _handleRequest(request, response){
        try{
            // Add basic properties, process accepted languages and GET parameters.
            await this._preprocessRequest(request, response);
            // Loads and processes user provided input data.
            await this._prepareRequest(request, response);
            // Find out which of the defined routes matches the request path.
            await this._resolveRequestRoute(request, response);
            // Check if current user's permissions allow to access to this resource.
            await this._checkAuthorization(request, response);
            // Execute the handler method of the route found.
            await this._processRoute(request, response);
            // Serialize the raw output returned by the route handler method and then send it to the client.
            await this._processOutput(request, response);
        }catch(ex){
            // Process, log and notify the client about the exception that has been thrown.
            await this._processException(ex, request, response);
        }finally{
            // Remove all the temporary resources associated to current request and then close the connection.
            this._completeRequest(request, response);
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
         * @type {RouteProcessorFactory} _routeProcessorFactory An instance of the class "RouteProcessorFactory" used to generate the object that will resolve the route matching requests path.
         *
         * @protected
         */
        this._routeProcessorFactory = new RouteProcessorFactory();
    }

    /**
     * Sets the factory class to use whenever generating instances of the "RouteProcessor" class, this method is chainable.
     *
     * @param {RouteProcessorFactory} factory An instance of the class "RouteProcessorFactory" representing the factory class to use.
     *
     * @returns {RoutedServer}
     */
    setRouteProcessorFactory(factory){
        if ( !this._validateProcessorClass('route', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._routeProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "RouteProcessor" class.
     *
     * @returns {RouteProcessorFactory} An instance of the class "RouteProcessorFactory" representing the factory class in use.
     */
    getRouteProcessorFactory(){
        return this._routeProcessorFactory;
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
        this._routeProcessorFactory.getRouters().add(router);
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
        this._routeProcessorFactory.getRouters().delete(router);
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
     * @param {Router[]} routers A sequential array of routers represented as instances of the class "Router".
     *
     * @returns {RoutedServer}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRouters(routers){
        if ( !Array.isArray(routers) ){
            throw new InvalidArgumentException('Invalid router array.', 1);
        }
        this._routeProcessorFactory.setRoutersAsArray(routers);
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
        const routers = new Set();
        const length = names.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Get the router matching current name.
            const router = RouterRepository.get(names[i]);
            if ( router !== null ){
                routers.add(router);
            }
        }
        this._routeProcessorFactory.setRouters(routers);
        return this;
    }

    /**
     * Returns all the routers queried while handling client requests, this method is chainable.
     *
     * @return {Set<Router>} A set containing all the routers defined for this server.
     */
    getRouters(){
        return this._routeProcessorFactory.getRouters();
    }

    /**
     * Removes all the routers queried while handling client requests, this method is chainable.
     *
     * @return {RoutedServer}
     */
    dropRouters(){
        this._routeProcessorFactory.setRoutersAsArray([]);
        return this;
    }

    /**
     * Removes all the cached data regarding the resolved URLs.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotImplementedYetException} This method cannot be used as of now because it has not been implemented yet.
     *
     * @async
     */
    async invalidateRouteCache(){
        // TODO: To be implemented.
        throw new NotImplementedYetException('This method has not been implemented yet.');
    }
}

module.exports = RoutedServer;
