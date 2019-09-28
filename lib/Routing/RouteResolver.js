'use strict';

// Including Lala's modules.
const {
    LinearResolverAlgorithm,
    SubsetResolverAlgorithm
} = require('./resolverAlgorithms');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * This class allows to resolve a route based on a given client request by processing all the routes contained in all the routers defined.
 */
class RouteResolver {
    /**
     * Checks is a given string is a valid and supported algorithm name.
     *
     * @param {string} algorithm A string representing the algorithm name.
     *
     * @returns {boolean} If the given string is a valid name will be returned "true".
     */
    static isSupportedAlgorithm(algorithm){
        return ['linear', 'subset'].indexOf(algorithm) !== -1;
    }

    /**
     * The class constructor.
     *
     * @param {Set<Router>} routers A set containing the routers to consider when resolving a route.
     * @param {?string} [algorithm] A string containing the name of the algorithm to use during route resolution, by default the "subset" algorithm is used.
     *
     * @throws {InvalidArgumentException} if an invalid routers set is given.
     * @throws {InvalidArgumentException} If an invalid or unsupported algorithm name is given.
     */
    constructor(routers, algorithm = null){
        /**
         * @type {Set<Router>} _routers A set containing all the routers that will be considered during route resolution.
         *
         * @protected
         */
        this._routers = routers;

        /**
         * @type {string} [_algorithm="subset"] A string containing the name of the algorithm to use in route resolution.
         *
         * @protected
         */
        this._algorithm = 'subset';

        /**
         * @type {?string} [_defaultLanguage] A string containing the default language to choose if multiple versions of the same route are found.
         *
         * @protected
         */
        this._defaultLanguage = null;

        this.setRouters(routers);
        if ( algorithm !== '' && typeof algorithm === 'string' ){
            this.setAlgorithm(algorithm);
        }
    }

    /**
     * Sets the routers to consider when resolving a route, this method is chainable.
     *
     * @param {Set<Router>} routers A set containing the routers.
     *
     * @return {RouteResolver}
     *
     * @throws {InvalidArgumentException} if an invalid routers set is given.
     */
    setRouters(routers){
        if ( !( routers instanceof Set ) ){
            throw new InvalidArgumentException('Invalid routers set.', 1);
        }
        this._routers = routers;
        return this;
    }

    /**
     * Returns all the routers that have been defined and that will be considered when resolving a route.
     *
     * @returns {Set<Router>} A set containing all the routers that have been defined.
     */
    getRouters(){
        return this._routers;
    }

    /**
     * Sets the name of the algorithm to use in route resolution, this method is chainable.
     *
     * @param {string} algorithm A string containing the name of the algorithm.
     *
     * @returns {RouteResolver}
     *
     * @throws {InvalidArgumentException} If an invalid or unsupported algorithm name is given.
     */
    setAlgorithm(algorithm){
        if ( !RouteResolver.isSupportedAlgorithm(algorithm) ){
            throw new InvalidArgumentException('Invalid or unsupported algorithm.', 1);
        }
        this._algorithm = algorithm;
        return this;
    }

    /**
     * Returns the name of the algorithm being used for route resolution.
     *
     * @returns {string} A string containing the name of the algorithm.
     */
    getAlgorithm(){
        return this._algorithm;
    }

    /**
     * Sets the default language to use when choosing one of multiple available versions of the same route, this method is chainable.
     *
     * @param language A string representing the language or null to unset current default language.
     */
    setDefaultLanguage(language){
        if ( language !== null  && ( language === '' || typeof language !== 'string' ) ){
            throw new InvalidArgumentException('Invalid language.', 1);
        }
        this._defaultLanguage = language;
        return this;
    }

    /**
     * Returns the default language to use when choosing one of multiple available versions of the same route.
     *
     * @returns {?string} A string representing the language or null if no language has been defined.
     */
    getDefaultLanguage(){
        return this._defaultLanguage;
    }

    /**
     * Finds out the route that matches the most according to the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {?RouteResolutionResult} An object representing the URL found and its properties or null if no route matching current request URL has been found.
     */
    resolve(request){
        let resolvedRoute = null;
        switch ( this._algorithm ){
            case 'linear':{
                resolvedRoute = LinearResolverAlgorithm.resolve(request, this._routers);
            }break;
            default:{
                resolvedRoute = SubsetResolverAlgorithm.resolve(request, this._routers,);
            }break;
        }
        return resolvedRoute;
    }
}

module.exports = RouteResolver;
