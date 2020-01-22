'use strict';

// Including Lala's modules.
const Route = require('./Route');
const ResourceRoute = require('./ResourceRoute');
const ViewRoute = require('./ViewRoute');
const RedirectRoute = require('./RedirectRoute');
const BaseRoute = require('./BaseRoute');
const View = require('../View/View');
const Authenticator = require('../Authenticator/Authenticator');
const RouteStorage = require('./RouteStorage');
const { generateUUID, mixin } = require('../Helpers/helpers/BuiltInHelpers');
const { Middlewares, ParamMiddlewares, Permissions, Policies } = require('./mixins');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * A class used to group multiple routes allowing to define settings for them all.
 *
 * @mixes Middlewares, ParamMiddlewares
 */
class Router extends mixin(Middlewares, ParamMiddlewares, Permissions, Policies) {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {string} _prefix A string containing an optional prefix to prepend to each route path.
         *
         * @protected
         */
        this._prefix = '';

        /**
         * @type {RouteStorage} _routeStorage
         *
         * @protected
         */
        this._routeStorage = new RouteStorage();

        /**
         * @type {?Authenticator} _authenticator An instance of the class that handles the authentication process, it must extend the "Authenticator" class, if set to null, no authentication will be performed.
         *
         * @protected
         */
        this._authenticator = null;

        /**
         * @type {boolean} _auth If set to "true" and if an authenticator class has been defined, authentication will be required in order to access to all the routes defined in this router instance.
         *
         * @protected
         */
        this._auth = false;

        /**
         * @type {string} _id A string containing an unique ID for this router used for caching purposes, the ID is a string representation of an UUID version 4.
         *
         * @protected
         */
        this._id = generateUUID(4, false);
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
     * @param {?string} prefix A string representing the prefix, if set to null, no prefix will be used.
     *
     * @return {Router}
     *
     * @throws {InvalidArgumentException} If an invalid prefix were given.
     */
    setPrefix(prefix){
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
     * @return {?string} A string representing the prefix, if no prefix has been defined, will be returned null instead.
     */
    getPrefix(){
        return this._prefix === '' ? null : this._prefix;
    }

    /**
     * Generates and adds a new route.
     *
     * @param {string} method A string containing the HTTP method to handle, use "*" to make the route available despite the method.
     * @param {(string|RegExp)} path A string containing the route pattern, alternatively, a regex is accepted.
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {BaseRoute} An object extending the class "BaseRoute" representing the generated route.
     *
     * @throws {InvalidArgumentException} If the given method is not supported.
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    addRoute(method, path, handler, options){
        // Generate the route object using the built-in factory.
        const route = Route.craft(method, path, handler, options);
        this.addRouteObject(route);
        return route;
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
        this._routeStorage.addRoute(route);
        return this;
    }

    /**
     * Removes all the routes matching a given method and path from this router, this method is chainable.
     *
     * @param {string} method A string containing the route's HTTP method.
     * @param {(string|RegExp)} route A string or a regular expression containing the path that the route has been defined with.
     *
     * @returns {Router}
     *
     * @see Note that this method may lead to performance degradation due to a complete scan required in order to find and remove all the route matching given method and path.
     */
    removeRoute(method, route){
        this._routeStorage.removeRouteByInfo(route);
        return this;
    }

    /**
     * Removes a router from this router, this method is chainable.
     *
     * @param {BaseRoute} route The route object that will be removed from this router.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If an invalid route object is given.
     */
    removeRouteObject(route){
        this._routeStorage.removeRoute(route);
        return this;
    }

    /**
     * Sets all the routes for this router, this method is chainable.
     *
     * @param {Set<BaseRoute>} routes A set containing all the routes to defined.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If an invalid set is given.
     */
    setRoutes(routes){
        this._routeStorage.setRoutes(routes);
        return this;
    }

    /**
     * Sets all the routes for this router from a given array of routes, this method is chainable.
     *
     * @param {BaseRoute[]} routes An array containing the routes to set.
     *
     * @returns {Router}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRouteAsArray(routes){
        this._routeStorage.setRouteAsArray(routes);
        return this;
    }

    /**
     * Adds a route suitable to handle GET requests.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    get(route, handler, options){
        return this.addRoute('GET', route, handler, options);
    }

    /**
     * Adds a route suitable to handle POST requests.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    post(route, handler, options){
        return this.addRoute('POST', route, handler, options);
    }

    /**
     * Adds a route suitable to handle PUT requests.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    put(route, handler, options){
        return this.addRoute('PUT', route, handler, options);
    }

    /**
     * Adds a route suitable to handle DELETE requests.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    delete(route, handler, options){
        return this.addRoute('DELETE', route, handler, options);
    }

    /**
     * Adds a route suitable to handle PATCH requests.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    patch(route, handler, options){
        return this.addRoute('PATCH', route, handler, options);
    }

    /**
     * Adds a route suitable to handle SEARCH requests, note that this is a non-standard HTTP method meant to handle searches acting like a GET request.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    search(route, handler, options){
        return this.addRoute('SEARCH', route, handler, options);
    }

    /**
     * Adds a route that can be triggered despite the HTTP method.
     *
     * @param {(string|RegExp|string[]|RegExp[])} route A string containing the route pattern, alternatively, a regex is accepted as well as an array containing multiple paths for this route (as strings or regex).
     * @param {controllerCallback} handler The function invoked to handle this request.
     * @param {RouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {Route} An instance of the class "Route" representing the created route.
     *
     * @throws {InvalidArgumentException} If the given route is not valid.
     * @throws {InvalidArgumentException} If the given handler is not a valid function.
     * @throws {InvalidArgumentException} If the given route has already been defined.
     */
    any(route, handler, options){
        return this.addRoute('*', route, handler, options);
    }

    /**
     * Adds a resource route, the ones used to serve static assets to the client.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {string} location A non empty string containing the path where resources associated to this route are stored in.
     * @param {?ResourceRouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {ResourceRoute} An instance of the class "ResourceRoute" representing the created route.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid location path is given.
     */
    resource(path, location, options = null){
        // Generate the route object using the built-in factory.
        const route = ResourceRoute.craft(path, location, options);
        this.addRouteObject(route);
        return route;
    }

    /**
     * Adds a resource route, the ones used to serve static assets to the client.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {(BaseView|string)} view An instance the view or a non-empty string containing the path to a view file.
     * @param {?ViewRouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {ViewRoute} An instance of the class "ViewRoute" representing the created route.
     */
    view(path, view, options = null){
        // Generate the route object using the built-in factory.
        const route = ViewRoute.craft(path, view, options);
        this.addRouteObject(route);
        return route;
    }

    /**
     * Adds a resource route, the ones used to serve static assets to the client.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {string} target A non empty string containing the location where the client should be redirected whenever this route gets triggered.
     * @param {?RedirectRouteOptions} [options] An optional object containing the additional options for this route.
     *
     * @returns {RedirectRoute} An instance of the class "RedirectRoute" representing the created route.
     */
    redirect(path, target, options = null){
        // Generate the route object using the built-in factory.
        const route = RedirectRoute.craft(path, target, options);
        // Add the generated route to the list of all the routes defined in this router.
        this.addRouteObject(route);
        return route;
    }

    /**
     * Sets the authenticator to use in order to authenticate requests handled by this router, this method is chainable.
     *
     * @param {?Authenticator} authenticator An instance of the authenticator class, the class must extend the "Authenticator" class.
     *
     * @return {Router}
     *
     * @throws {InvalidArgumentException} If an invalid authenticator were given.
     */
    setAuthenticator(authenticator){
        if ( authenticator !== null && !( authenticator instanceof Authenticator ) ){
            throw new InvalidArgumentException('Invalid authenticator.', 1);
        }
        this._authenticator = authenticator;
        this._auth = authenticator !== null;
        return this;
    }

    /**
     * Returns the authenticator to use in order to authenticate requests handled by this router.
     *
     * @return {?Authenticator} An instance of the authenticator class, if no authenticator has been defined, null will be returned instead.
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
     * Returns the object internally used to store routes.
     *
     * @returns {RouteStorage} An instance of the class "RouteStorage" representing the route storage engine.
     */
    getRouteStorage(){
        return this._routeStorage;
    }

    /**
     * Updates the indexes internally used by the route storage engine allowing to fix out-of-date route information, this method is chainable.
     *
     * @returns {Router}
     */
    updateRouteStorageIndex(){
        this._routeStorage.updateIndex();
        return this;
    }

    /**
     * Returns all the routes defined.
     *
     * @returns {Set<BaseRoute>} A set containing all the routes as instances of classes extending the "BaseRoute" class.
     */
    getRoutesSet(){
        return this._routeStorage.getRoutes();
    }

    /**
     * Checks if a route matching a given ID has been defined or not.
     *
     * @param id A string representing the route ID, usually an UUID version 4.
     *
     * @returns {boolean} If a route matching the given ID has been found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid route ID is given.
     */
    hasRoute(id){
        return this._routeStorage.hasRoute(id);
    }

    /**
     * Finds and returns a route matching a given ID.
     *
     * @param {string} id A string representing the route ID, usually an UUID version 4.
     *
     * @returns {?BaseRoute} An instances of classes extending the "BaseRoute" class or null if no route matching the given ID has been found.
     *
     * @throws {InvalidArgumentException} If an invalid route ID is given.
     */
    getRouteByID(id){
        return this._routeStorage.getRouteByID(id);
    }

    /**
     * Finds and returns a route matching a given name.
     *
     * @param {string} name A string representing the route name to look up.
     *
     * @returns {?BaseRoute} An instances of classes extending the "BaseRoute" class or null if no route matching the given ID has been found.
     *
     * @throws {InvalidArgumentException} If an invalid route name is given.
     */
    getRouteByName(name){
        return this._routeStorage.getRouteByName(name);
    }
}

module.exports = Router;
