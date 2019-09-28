'use strict';

// Including Lala's modules.
const {
    NotCallableException,
    RuntimeException
} = require('../../Exceptions');

/**
 * @typedef {Object} RouteResolutionResult An object containing the route found during resolution and its related properties.
 *
 * @property {BaseRoute} route An object representing the route that has been found during resolution, it must extend the "BaseRoute" class.
 * @property {Router} router An instance of the class "Router" representing the router the route found belongs to.
 * @property {?string} path A string representing the path to the file to return, it is intended as a relative path starting from the location path defined in the resource route found.
 * @property {boolean} allowsParameters If set to "true" it means that the route found extends the "ParameterizedRoute" class and then supports parameters in URL.
 * @property {Object.<string, string>} parameters An object containing the parameters found within the URL as key/value pairs.
 */

/**
 * Standardizes the implementation of route resolver algorithms.
 *
 * @abstract
 */
class ResolverAlgorithm {
    /**
     * Associates the parameters found by processing the request URL to their names as of defined in route definition.
     *
     * @param {?RouteResolutionResult} routeFound An object representing the URL found and its .
     *
     * @protected
     */
    static _processRouteParameters(routeFound){
        if ( routeFound.matches !== null && typeof routeFound.matches.groups === 'object' ){
            routeFound.parameters = {};
            // Process each matches found after executing the regex.
            for ( const name in routeFound.matches.groups ){
                // Get the real parameter name by current capturing group name, namely the surrogate ID.
                const parameterName = routeFound.route.getParameterNameBySurrogate(name);
                if ( parameterName !== null ){
                    // If found it is a valid parameter and it must be added to the list.
                    routeFound.parameters[parameterName] = routeFound.matches.groups[name];
                }
            }
        }
    }

    /**
     * Finds out the route that matches the most according to the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {Set<Router>} routers A set containing all the routers that should be considered during route resolution.
     *
     * @returns {RouteResolutionResult}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    static resolve(request, routers){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'CacheDriver' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }
}

module.exports = ResolverAlgorithm;
