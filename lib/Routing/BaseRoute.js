'use strict';

// Including Lala's modules.
const Middlewares = require('./Middlewares');
const RouteRepository = require('./RouteRepository');
const Authenticator = require('../Authenticator/Authenticator');
const { generateUUID, mixin } = require('../helpers');
const {
    RuntimeException,
    InvalidArgumentException,
    NotCallableException,
    NotImplementedYetException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * @typedef BaseRouteOptions The base definition for the objects used as an options wrapper in route crafting.
 */

/**
 * This class allows to define classes used to represent the routes.
 *
 * @mixes Middlewares
 *
 * @abstract
 */
class BaseRoute extends mixin(Middlewares) {
    /**
     * Returns a list of all the supported HTTP methods.
     *
     * @returns {string[]} A sequential array of strings containing the name of the supported HTTP methods.
     */
    static getSupportedMethods(){
        return [].concat(SUPPORTED_METHODS);
    }

    /**
     * Checks if a given method is supported by the routing engine.
     *
     * @param {string} method A string containing the method name.
     *
     * @returns {boolean} If the given method is supported will be returned "true".
     */
    static isSupportedMethod(method){
        return method !== '' && typeof method === 'string' && ( method === '*' || SUPPORTED_METHODS.indexOf(method.toUpperCase()) !== -1 );
    }

    /**
     * Generates an instance of this class based on given parameters and additional configuration.
     *
     * @param {BaseRouteOptions} options Some additional configuration properties that the factory method should take care of.
     *
     * @returns {BaseRoute} The instance of this class that has been generated and configured by this factory method.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     */
    static craft(options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Registers this route into the global index allowing to lookup this route by its ID and name.
     *
     * @param {?string} [name]
     *
     * @throws {InvalidArgumentException}
     *
     * @protected
     */
    _register(name = null){
        if ( this._name !== null && RouteRepository.has(this._name) ){
            throw new InvalidArgumentException('This name is already in use.');
        }
        if ( name !== null ){
            RouteRepository.remove(name);
        }
        RouteRepository.register(this, true);
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'BaseRoute' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {?(string|RegExp)} [_path] A string representing the request path that will trigger this route, alternatively, a regex can be used as well as a string.
         *
         * @protected
         */
        this._path = null;

        /**
         * @type {boolean} [_isRegex=false] If set to "true" it means that a regex has been set as the route path rather than a plain string.
         *
         * @protected
         */
        this._isRegex = false;

        /**
         * @type {?Authenticator} [_authenticator] An instance of the class that handles user authentications, it must extends the "Authenticator" class.
         *
         * @protected
         */
        this._authenticator = null;

        /**
         * @type {?string} [_name] A string containing a name for this route, it should be unique and can be used to lookup this route within the router it has been add to.
         *
         * @protected
         */
        this._name = null;

        /**
         * @type {string} _id A string containing an unique ID for this route, the generated ID is an UUID version 4.
         *
         * @protected
         */
        this._id = generateUUID(4, false);

        /**
         * @type {string} [_method="GET"] A string containing the HTTP method this route can be triggered from.
         *
         * @protected
         */
        this._method = 'GET';

        /**
         * @type {?boolean} [_auth] Defines if this route is protected by user authentication, if set to null, default value will be used instead.
         *
         * @protected
         */
        this._auth = null;

        /**
         * @type {?RegExp} [_regex] An instance of the class "RegExp" representing the regular expression to use to check if this route matches a request path.
         *
         * @protected
         */
        this._regex = null;

        /**
         * @type {boolean} [_allowParameters=true] If set to "true" it means that this route allows parameters defined in request path, so they must be processed once a path is defined.
         *
         * @protected
         */
        this._allowParameters = true;

        /**
         * @type {?string} [_language] A string containing the language this route should be available for.
         *
         * @protected
         */
        this._language = null;
    }

    /**
     * Sets the path that will trigger this route whenever a request occurs, this method is chainable.
     *
     * @param {(string|RegExp)} path A string representing the path to the route, alternatively, an instance of the class "RegExp" can be used as well.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPath(path){
        if ( ( path === '' || typeof path !== 'string' ) && !( path instanceof RegExp ) ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._path = path;
        this._isRegex = typeof path !== 'string';
        return this;
    }

    /**
     * Returns the path that will trigger this route whenever a request occurs.
     *
     * @returns {?(string|RegExp)} A string representing the path or null if no path has been defined yet, alternatively, a regular expression can be returned.
     */
    getPath(){
        return this._path;
    }

    /**
     * Returns if the route path has been defined as a regular expression rather than as a plain string.
     *
     * @returns {boolean} If a regex has been used as the route path will be returned "true".
     */
    isRegex(){
        return this._isRegex;
    }

    /**
     * Sets the authenticator to use to authenticate an user whenever accesses to this route, this method is chainable.
     *
     * @param {?Authenticator} authenticator An instance of the authenticator class, it must extends the "Authenticator" class, if set to null, no authentication will be required.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid authenticator class instance is given.
     */
    setAuthenticator(authenticator){
        if ( !( authenticator instanceof Authenticator ) ){
            throw new InvalidArgumentException('Invalid authenticator.', 1);
        }
        this._authenticator = authenticator;
        return this;
    }

    /**
     * Returns the authenticator to use to authenticate an user whenever accesses to this route.
     *
     * @returns {?Authenticator} An instance of the authenticator class or null if no authentication is required for this route.
     */
    getAuthenticator(){
        return this._authenticator;
    }

    /**
     * Checks if user authentication is required to access to this route.
     *
     * @returns {boolean} If authentication is required will be returned "true".
     */
    authenticationEnabled(){
        return this._authenticator !== null;
    }

    /**
     * Sets the unique name for this route, this method is chainable.
     *
     * @param {?string} name A string representing the route name or null to remove current route name.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    setName(name){
        if ( name !== null && ( name === '' || typeof name !== 'string' ) ){
            throw new InvalidArgumentException('Invalid name.', 1);
        }
        //
        const previous = this._name;
        this._name = name;
        //
        this._register(previous);
        return this;
    }

    /**
     * Returns the unique name associated to this route.
     *
     * @returns {?string} A string containing the name or null if no name has been defined.
     */
    getName(){
        return this._name;
    }

    /**
     * Sets the HTTP method that must be used to trigger this route in a HTTP request, this method is chainable.
     *
     * @param {string} method A string containing the HTTP method name, use "*" to allow access through any method.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid method name is given.
     * @throws {InvalidArgumentException} If an unsupported method is given.
     */
    setMethod(method){
        if ( method === '' || typeof method !== 'string' ){
            throw new InvalidArgumentException('Invalid method name.', 1);
        }
        if ( !BaseRoute.isSupportedMethod(method) ){
            throw new InvalidArgumentException('Unsupported method.', 2);
        }
        this._method = method.toUpperCase();
        return this;
    }

    /**
     * Returns the HTTP method that must be used to trigger this route.
     *
     * @returns {string} A string representing the HTTP method.
     */
    getMethod(){
        return this._method;
    }

    /**
     * Sets if this route requires user authentication, this method is chainable.
     *
     * @param {?boolean} auth If set to "true" and if an authenticator provider has been defined, user authentication will be required, if set to null, default value will be used instead.
     *
     * @return {BaseRoute}
     */
    setAuth(auth){
        this._auth = auth === true ? true : ( auth === false ? false : null );
        return this;
    }

    /**
     * Returns if this route requires user authentication.
     *
     * @return {?boolean} If authentication has been marked as required for this route will be returned "true", if no explicit authentication setting has been defined, null will be returned instead.
     */
    getAuth(){
        return this._auth === true ? true : ( this._auth === false ? false : null );
    }

    /**
     * Sets the language this route should be available for, this method is chainable.
     *
     * @param {?string} language A string containing the code corresponding to the language this route should be available for, if set to null this route will be available regardless of the client language.
     *
     * @return {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid language code is given.
     */
    setLanguage(language){
        if ( language !== null && ( language === '' || typeof language !== 'string' ) ){
            throw new InvalidArgumentException('Invalid language.', 1);
        }
        this._language = language;
        return this;
    }

    /**
     * Returns the language this route should be available for.
     *
     * @returns {?string} A string containing the language code defined or null if no language has been defined for this route.
     */
    getLanguage(){
        return this._language;
    }

    /**
     * Returns this route unique ID.
     *
     * @returns {string} A string representing the route ID, an UUID version 4.
     */
    getID(){
        return this._id;
    }

    /**
     * Return the regular expression to use to check if this route matches a request path.
     *
     * @returns {?RegExp}
     */
    getRegex(){
        return this._regex;
    }

    /**
     * Drops all cached data related to this route.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotImplementedYetException} This method cannot be used as of now because it has not been implemented yet.
     *
     * @async
     */
    async invalidateCache(){
        // TODO: To be implemented once task #LALA-12 has been completed.
        throw new NotImplementedYetException('This method has not been implemented yet.');
    }

    /**
     * Generates and returns a path that can be used in a request to trigger this route.
     *
     * @returns {?string} A string containing the path or null if no path has been defined for this route.
     *
     * @throws {BadMethodCallException} Whenever compiling a route whose path has been defined as a regex as it is not supported yet.
     */
    compile(){
        if ( this._path instanceof RegExp ){
            throw new BadMethodCallException('Cannot compile a route when path is defined as a regex.', 1);
        }
        return this._path;
    }

    /**
     * Triggers this route, this method should be overridden.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<*>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async execute(request, response){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

/**
 * Defines all the HTTP methods supported by route objects.
 *
 * @enum {string[]} SUPPORTED_METHODS
 * @readonly
 */
const SUPPORTED_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'SEARCH']);

/**
 * @constant Defines the HTTP methods supported by route objects.
 *
 * @type {string[]}
 * @default
 */

Object.defineProperty(BaseRoute, 'SUPPORTED_METHODS', {
    writable : false,
    enumerable : true,
    configurable : false,
    value: SUPPORTED_METHODS
});

module.exports = BaseRoute;
