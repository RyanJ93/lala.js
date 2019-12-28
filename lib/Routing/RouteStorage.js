'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const ResourceRoute = require('./ResourceRoute');
const {
    InvalidArgumentException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * @typedef {Object} RouteIndex An object that contains all the routes indexed.
 *
 * @property {Map<(string|RegExp), Map<string, ResourceRoute>>} resourceRoutes Contains all the routes that maps static assets that have been indexed.
 * @property {Map<string, Map<(string|RegExp), Map<string, BaseRoute>>>} regularRoutes Contains all other routes that have been indexed.
 */

/**
 * An object that helps to store routes and indexes them in order to improve route resolution performance.
 */
class RouteStorage {
    /**
     * Removes all data related to a given route from the internal index.
     *
     * @param {BaseRoute} route An instance of the class implementing the route, it must extend the "BaseRoute" class.
     *
     * @protected
     */
    _dropFromIndex(route){
        const prop = route instanceof ResourceRoute ? 'resourceRoutes' : 'regularRoutes';
        const method = route.getMethod();
        if ( this._index[prop].has(method) ){
            // Get the branch that contains all the routes matching this route's method.
            const methodStack = this._index[prop].get(method);
            const path = route.getPath();
            if ( methodStack.has(path) ){
                // If this branch contains a branch for this route path, then remove the branch containing this route's language from it.
                const language = route.getLanguage();
                methodStack.get(path).delete(language);
                if ( methodStack.get(path).size === 0 ){
                    // If this branch is now empty, then remove it.
                    methodStack.delete(path);
                }
            }
            if ( this._index[prop].get(method).size === 0 ){
                // If this branch is now empty, then remove it.
                this._index[prop].delete(method);
            }
        }
    }

    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {RouteIndex} _index The property hat contain the whole route index.
         *
         * @protected
         */
        this._index = {
            resourceRoutes: new Map(),
            regularRoutes: new Map()
        };

        /**
         * @type {Set<BaseRoute>} _routes A set containing a list of all the routes stored.
         *
         * @protected
         */
        this._routes = new Set();

        /**
         * @type {Set<string>} _routesID A set containing the unique ID of all the routes stored.
         *
         * @protected
         */
        this._routesID = new Set();
    }

    /**
     * Adds a single route to this storage instance, this method is chainable.
     *
     * @param {BaseRoute} route An object representing the route to add, it must extend the "BaseRoute" class.
     *
     * @returns {RouteStorage}
     *
     * @throws {InvalidArgumentException} If an invalid route object is given.
     */
    addRoute(route){
        if ( !( route instanceof BaseRoute ) ){
            throw new InvalidArgumentException('Invalid route.', 1);
        }
        const id = route.getID();
        if ( !this._routesID.has(id) ){
            this._routes.add(route);
            this._routesID.add(id);
            // Add this route to the internal index.
            this.indexRoute(route, false, false);
        }
        return this;
    }

    /**
     * Removes a single route from this storage instance, this method is chainable.
     *
     * @param {BaseRoute} route An object representing the route to add, it must extend the "BaseRoute" class.
     *
     * @returns {RouteStorage}
     *
     * @throws {InvalidArgumentException} If an invalid route object is given.
     */
    removeRoute(route){
        if ( !( route instanceof BaseRoute ) ){
            throw new InvalidArgumentException('Invalid route.', 1);
        }
        const id = route.getID();
        if ( this._routesID.has(id) ){
            // Removes the route from the internal index.
            this._dropFromIndex(route);
            this._routes.delete(route);
            this._routesID.delete(id);
        }
        return this;
    }

    /**
     * Removes one or more routes based on given information.
     *
     * @param {string} method A string containing the name of the HTTP method of the routes to remove.
     * @param {?(string|RegExp)} [pattern] A string representing the route pattern, if route pattern has been defined as a regex, a RegExp object can be used.
     *
     * @returns {number} An integer number representing the amount of routes that have been removed.
     *
     * @throws {InvalidArgumentException} If an invalid HTTP method is given.
     */
    removeRouteByInfo(method, pattern = null){
        if ( method === '' || typeof method !== 'string' ){
            throw new InvalidArgumentException('Invalid method.', 1);
        }
        let count = 0;
        // Scan all the routes defined in order to find out and then remove the ones matching given method and pattern (if given).
        if ( pattern === null ){
            for ( const routeObject of this._routes ){
                if ( routeObject.getMethod() === method ){
                    this.removeRoute(routeObject);
                    count++;
                }
            }
        }else{
            for ( const routeObject of this._routes ){
                if ( routeObject.getMethod() === method && routeObject.getPath() === route ){
                    this.removeRoute(routeObject);
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Sets the routes to store in this storage instance, this method is chainable.
     *
     * @param {?Set<BaseRoute>} routes A set containing all the routes to store, routes must be represented as objects extending the "BaseRoute" class.
     *
     * @returns {RouteStorage}
     *
     * @throws {InvalidArgumentException} If an invalid route set is given.
     */
    setRoutes(routes){
        if ( routes !== null && !( routes instanceof Set ) ){
            throw new InvalidArgumentException('Invalid route set.', 1);
        }
        // Remove all the currently defined routes and their related data.
        this.dropRoutes();
        if ( routes !== null ){
            // Validate and add the given routes.
            for ( const route of this._routes ){
                if ( route instanceof BaseRoute ){
                    this.addRoute(route);
                }
            }
        }
        return this;
    }

    /**
     * Sets the routes to store in this storage instance, this method is chainable.
     *
     * @param {?BaseRoute[]} routes An array containing all the routes to store, routes must be represented as objects extending the "BaseRoute" class.
     *
     * @returns {RouteStorage}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setRouteAsArray(routes){
        if ( routes !== null && !Array.isArray(routes) ){
            throw new InvalidArgumentException('Invalid route array.', 1);
        }
        // Remove all the currently defined routes and their related data.
        this.dropRoutes();
        if ( routes !== null ){
            const length = routes.length;
            // Validate and add the given routes.
            for ( let i = 0 ; i < length ; i++ ){
                if ( routes[i] instanceof BaseRoute ){
                    this.addRoute(routes[i]);
                }
            }
        }
        return this;
    }

    /**
     * Removes all the routes that have been defined so far, this method is chainable.
     *
     * @returns {RouteStorage}
     */
    dropRoutes(){
        // Drop the index.
        this._index.resourceRoutes.clear();
        this._index.regularRoutes.clear();
        // Drop all routes.
        this._routes.clear();
        this._routesID.clear();
        return this;
    }

    /**
     * Returns all the routes stored in this storage instance.
     *
     * @returns {Set<BaseRoute>} A set containing all the routes found.
     */
    getRoutes(){
        return this._routes;
    }

    /**
     * Checks if a route has been indexed according to its unique ID.
     *
     * @param {string} id A string representing the route unique ID, typically an UUID version 4 representation.
     *
     * @returns {boolean} If the given ID belongs to an indexed route will be retuned "true".
     *
     * @throws {InvalidArgumentException} If an invalid unique route ID is given.
     */
    hasRoute(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid route ID.', 1);
        }
        return this._routesID.has(id);
    }

    /**
     * Returns a route that has been indexed matching the given unique ID.
     *
     * @param {string} id A string representing the route unique ID, typically an UUID version 4 representation.
     *
     * @returns {?BaseRoute} An object representing the route found or null if no route matching the given ID has been found.
     *
     * @throws {InvalidArgumentException} If an invalid unique route ID is given.
     */
    getRouteByID(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid route ID.', 1);
        }
        let routeFound = null;
        // Scan every routes in order to find out the matching one.
        for ( const route of this._routes ){
            if ( route.getID() === id ){
                routeFound = route;
                break;
            }
        }
        return routeFound;
    }

    /**
     * Returns a route that has been indexed matching the given name.
     *
     * @param {string} name A string containing the name that should be looked for.
     *
     * @returns {?BaseRoute} An object representing the route found or null if no route matching the given name has been found.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    getRouteByName(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid route name.', 1);
        }
        let routeFound = null;
        // Scan every routes in order to find out the matching one.
        for ( const route of this._routes ){
            if ( route.getName() === name ){
                routeFound = route;
                break;
            }
        }
        return routeFound;
    }

    /**
     * Returns the complete hierarchy generated to index the routes that maps static assets.
     *
     * @returns {Map<(string|RegExp), Map<string, ResourceRoute>>} A map containing the full hierarchy.
     * TODO: Add reference to hierarchy documentation.
     */
    getResourceRoutesFromIndex(){
        return this._index.resourceRoutes;
    }

    /**
     * Returns the complete hierarchy generated to index the routes that are not mapping static assets.
     *
     * @returns {Map<string, Map<string|RegExp, Map<string, BaseRoute>>>} A map containing the full hierarchy.
     */
    getRegularRoutesFromIndex(){
        return this._index.regularRoutes;
    }

    /**
     * Adds a single route to the internal index, this method is chainable.
     *
     * @param {BaseRoute} route An object representing the route to index, it must extend the "BaseRoute" class.
     * @param {boolean} [reindex=true] If set to "true" and if the given route has already been indexed, indexed data related to it will be dropped and the route will be indexed over again.
     * @param {boolean} [add=false] If set to "true" and if the given route is not stored in this storage instance it will be added first, otherwise an exception will be thrown.
     *
     * @returns {RouteStorage}
     *
     * @throws {InvalidArgumentException} If an invalid route is given.
     * @throws {BadMethodCallException} If the given route is not stored in this storage instance and the "add" parameter was set to "false".
     */
    indexRoute(route, reindex = true, add = false){
        if ( !( route instanceof BaseRoute ) ){
            throw new InvalidArgumentException('Invalid route.', 1);
        }
        // Check if the given route has already been added and then indexed.
        const notFound = !this._routesID.has(route.getID());
        if ( add === true ){
            if ( notFound ){
                // Add the route to the storage if it doesn't exist and the add option has been set to "true".
                this.addRoute(route);
            }
        }else if ( notFound ){
            throw new BadMethodCallException('Undefined route.', 2);
        }else{
            let stack;
            if ( reindex === true ){
                // THis route must be reindexed, then remove it from the index before indexing it.
                this._dropFromIndex(route);
            }
            if ( route instanceof ResourceRoute ){
                stack = this._index.resourceRoutes;
            }else{
                const method = route.getMethod();
                // Get the branch that contains all the routes matching this route's method.
                if ( !this._index.regularRoutes.has(method) ){
                    this._index.regularRoutes.set(method, new Map());
                }
                stack = this._index.regularRoutes.get(method);
            }
            // Get the key to use to pick the inner branch.
            const regex = route.getRegex();
            const path = regex === null ? route.getPath() : regex;
            if ( reindex !== false || !stack.has(path) ){
                stack.set(path, new Map());
            }
            // Get the final branch according to route language.
            const language = route.getLanguage();
            stack.get(path).set(language, route);
            if ( reindex !== true ){
                // Attach an event in order to reindex this route if a property changes.
                route.on('updated', (property) => {
                    if ( property === 'method' || property === 'path' || property === 'language' ){
                        // One of the key property has changed, routes must be reindexed.
                        this.indexRoute(route, true, false);
                    }
                });
            }
        }
        return this;
    }

    /**
     * Reindex all the routes that have been defined in this storage instance, this method is chainable.
     *
     * @returns {RouteStorage}
     */
    updateIndex(){
        // Drop all indexed data.
        this._index.resourceRoutes.clear();
        this._index.regularRoutes.clear();
        // Loop each route and index them one by one.
        for ( const route of this._routes ){
            this.indexRoute(route, false, false);
        }
        return this;
    }
}

module.exports = RouteStorage;
