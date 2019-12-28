'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const {
    InvalidArgumentException,
    MisconfigurationException
} = require('../Exceptions');

/**
 * Contains all the registered routers.
 */
class RouteRepository extends Repository {
    /**
     * Registers a new router.
     *
     * @param {BaseRoute} route An object representing the route to register, it must extend the "BaseRoute" route.
     * @param {boolean} [overwrite=false]  If set to "true" it means that if the route has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If another route with the same ID has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid route class is given.
     */
    static register(route, overwrite = false){
        const baseRouteClass = require('./BaseRoute');
        const parameterizedRouteClass = require('./ParameterizedRoute');
        if ( !( route instanceof baseRouteClass ) && !( route instanceof parameterizedRouteClass ) ){
            throw new InvalidArgumentException('Invalid route class.', 4);
        }
        const name = route.getName();
        if ( name !== null ){
            // Index the given route by its name.
            super.register(name, route, 'com.lala.route.name', overwrite);
        }
        // Index the given route by its unique ID.
        super.register(route.getID(), route, 'com.lala.route.id', overwrite);
    }

    /**
     * Removes a route that has been registered.
     *
     * @param {string} identifier A string containing the route ID, alternatively, its name can be used too.
     *
     * @throws {InvalidArgumentException} If an invalid route name/ID is given.
     */
    static remove(identifier){
        // Check if the given string is a route name and look up the corresponding route.
        let route = super.get(identifier, 'com.lala.route.name');
        if ( route === null ){
            // If no route has been found, then probably the given string is an UUID representation.
            route = super.get(identifier, 'com.lala.route.id');
        }
        if ( route !== null ){
            const name = route.getName();
            if ( name !== null ){
                super.remove(route.getName(), 'com.lala.route.name');
            }
            super.remove(route.getID(), 'com.lala.route.id');
        }
    }

    /**
     * Checks if a route matching a given name or ID has been registered or not.
     *
     * @param {string} identifier A string containing the route ID, alternatively, its name can be used too.
     *
     * @returns {boolean} If the route exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid route name/ID is given.
     */
    static has(identifier){
        return super.get(identifier, 'com.lala.route.name') !== null || super.get(identifier, 'com.lala.route.id') !== null;
    }

    /**
     * Returns the route matching a given name or ID.
     *
     * @param {string} identifier A string containing the route ID, alternatively, its name can be used too.
     *
     * @returns {?BaseRoute} An object representing the route and extending the "BaseRoute" class, if no object is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid route name/ID is given.
     */
    static get(identifier){
        const route = super.get(identifier, 'com.lala.route.name');
        // If no route has been found searching by its name, then the given identifier may be a route unique ID.
        return route === null ? super.get(identifier, 'com.lala.route.id') : route;
    }

    /**
     * Returns all the routers that have been registered.
     *
     * @returns {Object.<string, BaseRoute>} An object having as key the object name and as value the router itself.
     */
    static getAll(){
        // Get all the routes indexed by their names.
        const routes = super.getAll('com.lala.route.name');
        // Then get all the routes indexed by their unique IDs and then merge those two lists.
        return Object.assign(routes, super.getAll('com.lala.route.id'));
    }

    /**
     * Sets the default route.
     *
     * @param {string} identifier A string containing the route ID, alternatively, its name can be used too.
     *
     * @throws {InvalidArgumentException} If an invalid route name/ID is given.
     * @throws {InvalidArgumentException}
     */
    static setDefault(identifier){
        const route = this.get(identifier);
        if ( route === null ){
            throw new InvalidArgumentException('The given route has not been registered.', 3);
        }
        const routeID = route.getID();
        super.setDefault(routeID, 'com.lala.route.id');
    }

    /**
     * Returns the default route to use.
     *
     * @returns {BaseRoute} An instance of the class "Router" representing the default router.
     *
     * @throws {MisconfigurationException} If no default route has been found or no default route has been defined yet.
     */
    static getDefault(){
        try{
            return super.getDefault('com.lala.route.id');
        }catch{
            throw new MisconfigurationException('No default route found.', 1);
        }
    }
}

module.exports = RouteRepository;
