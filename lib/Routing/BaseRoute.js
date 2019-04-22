'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    InvalidArgumentException
} = require('../Exceptions');
const Keywords = require('../Support/Keywords');
const { generateUUID } = require('../helpers');

/**
 * @type {{string: BaseRoute}} _nameIndex An object having as key the route unique name and as value the route itself used to lookup a defined route whenever searching by name.
 *
 * @private
 */
let _nameIndex = {};

/**
 * @type {{string: BaseRoute}} _IDIndex An object having as key a string representation of the route unique ID, an UUID version 4, and as value the route itself used to lookup a route searching by ID.
 *
 * @private
 */
let _IDIndex = {};

/**
 * This class allows to define classes used to represent the routes.
 *
 * @abstract
 */
/* abstract */ class BaseRoute {
    /**
     * Returns a list of all the supported HTTP methods.
     *
     * @returns {string[]} A sequential array of strings containing the name of the supported HTTP methods.
     */
    static getSupportedMethods(){
        return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'SEARCH'];
    }

    /**
     * Checks if a given method is supported by the routing engine.
     *
     * @param {string} method A string containing the method name.
     *
     * @returns {boolean} If the given method is supported will be returned "true".
     */
    static isSupportedMethod(method){
        return method !== '' && typeof method === 'string' && ( method === '*' || BaseRoute.getSupportedMethods().indexOf(method.toUpperCase()) !== -1 );
    }

    /**
     * Finds and returns a route matching the given name.
     *
     * @param {string} name A string containing the name to lookup.
     *
     * @return {(BaseRoute|null)} An instance of the class that represents the route, that must extend the "BaseRoute" class, or null if no route matching the given name is found.
     *
     * @throws {InvalidArgumentException} If an invalid route name is given.
     */
    static findByName(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid route name.', 1);
        }
        return _nameIndex.hasOwnProperty(name) ? _nameIndex[name] : null;
    }

    /**
     * Finds and returns a route matching the given ID.
     *
     * @param {string} id A string representation of the route ID, an UUID version 4.
     *
     * @return {(BaseRoute|null)}  An instance of the class that represents the route, that must extend the "BaseRoute" class, or null if no route matching the given ID is found.
     *
     * @throws {InvalidArgumentException} If an invalid route ID is given.
     */
    static findByID(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid route ID.', 1);
        }
        return _IDIndex.hasOwnProperty(id) ? _IDIndex[id] : null;
    }

    /**
     * Generates the regular expression patter to use for capture a given parameter.
     *
     * @param {string} name A string containing the parameter name.
     * @param {boolean} optional If set to "true" it means that the parameter to capture is optional.
     *
     * @return {string} A string containing the regular expression generated.
     *
     * @private
     */
    _getParameterRegex(name, optional){
        // Get filter value.
        const filter = this._parameterFilters.get(name);
        // Pick the right syntax for the regex capturing group.
        const closing = optional === true ? ')' : ')?';
        if ( typeof filter === 'undefined' ){
            // No filter defined for the given parameter, using the generic regex.
            return '([a-zA-Z0-9_\.-]+' + closing;
        }
        if ( typeof filter === 'string' ){
            if ( filter.charAt(0) === '@' ){
                // This filter has been defined using a keyword, for instance: @number => '[0-9]+'.
                const keyword = Keywords.getValue(filter);
                return keyword === null ? ( '([a-zA-Z0-9_\.-]+' + closing ) : ( '(' + keyword + closing );
            }
            return '(' + filter + closing;
        }
        // This filter has been defined as an instance of the class "RegExp", getting its string representation.
        return '(' + filter.toString() + closing;
    }

    /**
     * Extracts all the parameters required by this route according to its path.
     *
     * @private
     */
    _prepare(){
        // Drop older parameters.
        this._parameters = new Set();
        this._optionalParameters = new Set();
        if ( this._allowParameters === true && this._path !== null && typeof this._path === 'string' ){
            // Split the route path into levels.
            const components = this._path.split('/');
            const length = components.length;
            let count = 0;
            for ( let i = 0 ; i < length ; i++ ){
                // Get the parameter prefix used to determine if it is a parameter and what kind of parameter is.
                const prefix = components[i].substr(0, 2);
                if ( prefix === ':?' ){
                    // If a parameter starts by "?:" it is an optional one, for instance: /posts/?:page
                    const name = components[i].substr(2);
                    this._optionalParameters.add(name);
                    // Get the patter to capture this parameter.
                    components[i] = this._getParameterRegex(name, true);
                    count++;
                }else if ( prefix.charAt(0) === ':' ){
                    // If a parameter starts by ":" it is a required one, for instance: /profiles/:username
                    const name = components[i].substr(1);
                    this._parameters.add(name);
                    components[i] = this._getParameterRegex(name, false);
                    count++;
                }
            }
            // If at least one parameter has been found, convert the processed path into a RegExp object.
            this._regex = count === 0 ? null : new RegExp('^' + components.join('/') + '$');
        }
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'BaseRoute' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {(string|RegExp|null)} _path A string representing the request path that will trigger this route, alternatively, a regex can be used as well as a string.
         *
         * @private
         */
        this._path = null;

        /**
         * @type {boolean} If set to "true" it means that a regex has been set as the route path rather than a plain string.
         *
         * @private
         */
        this._isRegex = false;

        /**
         * @type {Map<string, function>} _middlewares A map having as key a string containing the middleware identifier and as value the function to execute when the route gets triggered.
         *
         * @private
         */
        this._middlewares = new Map();

        /**
         * @type {(Authenticator|null)} _authenticator An instance of the class that handles user authentications, it must extends the "Authenticator" class.
         *
         * @private
         */
        this._authenticator = null;

        /**
         * @type {(string|null)} _name A string containing a name for this route, it should be unique and can be used to lookup this route within the router it has been add to.
         *
         * @private
         */
        this._name = null;

        /**
         * @type {string} A string containing an unique ID for this route, the generated ID is an UUID version 4.
         *
         * @private
         */
        this._id = generateUUID(4, false);

        /**
         * @type {string} _method A string containing the HTTP method this route can be triggered from.
         *
         * @private
         */
        this._method = 'GET';

        /**
         * @type {(null|boolean)} _auth Defines if this route is protected by user authentication, if set to null, default value will be used instead.
         *
         * @private
         */
        this._auth = null;

        /**
         * @type {Set<string>} _parameters A set containing all the parameters found in the route path.
         *
         * @private
         */
        this._parameters = new Set();

        /**
         * @type {Set<string>} _optionalParameters A set containing all the optional parameters accepted by this route.
         *
         * @private
         */
        this._optionalParameters = new Set();

        /**
         * @type {Map<string, RegExp>} _parameterFilters A map having as key a string representing the param name and as value a regex (a string or a RegExp object) containing the filtering condition to apply.
         *
         * @private
         */
        this._parameterFilters = new Map();

        /**
         * @type {(RegExp|null)} _regex An instance of the class "RegExp" representing the regular expression to use to check if this route matches a request path.
         *
         * @private
         */
        this._regex = null;

        /**
         * @type {boolean} [_allowParameters=true] If set to "true" it means that this route allows parameters defined in request path, so they must be processed once a path is defined.
         *
         * @private
         */
        this._allowParameters = true;

        _IDIndex[this._id] = this;
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
        // Extract the route parameters (if allowed) and generate the regex.
        this._prepare();
        return this;
    }

    /**
     * Returns the path that will trigger this route whenever a request occurs.
     *
     * @returns {(string|null)} A string representing the path or null if no path has been defined yet.
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
     * Adds a middleware function to the list of the functions to invoke whenever this route gets triggered, this method is chainable.
     *
     * @param {string} identifier A string representing the middleware identifier, it must be unique.
     * @param {function} handler The function to invoke whenever the middleware is fired.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid middleware identifier is given.
     * @throws {InvalidArgumentException} If an invalid handler function is given.
     */
    addMiddleware(identifier, handler){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid middleware identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid middleware handler function.', 2);
        }
        this._middlewares.set(identifier, handler);
        return this;
    }

    /**
     * Removes a middleware, this method is chainable.
     *
     * @param {string} identifier A string representing the identifier of the middleware to remove.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid middleware identifier is given.
     */
    removeMiddleware(identifier){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid middleware identifier.', 1);
        }
        this._middlewares.delete(identifier);
        return this;
    }

    /**
     * Sets the middleware to execute whenever this route gets triggered, this method is chainable.
     *
     * @param {{string: function}} middlewares An object having as ket the middleware unique identifier and as value the handler function.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middleware object.', 1);
        }
        // Drop all the middleware currently in list.
        this._middlewares = new Map();
        for ( const identifier in middlewares ){
            if ( middlewares.hasOwnProperty(identifier) && identifier !== '' && typeof identifier === 'string' && typeof middlewares[identifier] === 'function' ){
                this._middlewares.set(identifier, middlewares[identifier]);
            }
        }
        return this;
    }

    /**
     * Removes all the middlewares that have been defined previously, this method is chainable.
     *
     * @returns {BaseRoute}
     */
    dropMiddlewares(){
        this._middlewares = new Map();
        return this;
    }

    /**
     * Returns all the middlewares that have been defined.
     *
     * @returns {Map<string, function>} A map containing having as key a string representing the middleware unique identifier and as value the handler function.
     */
    getMiddlewares(){
        return this._middlewares;
    }

    /**
     * Sets the authenticator to use to authenticate an user whenever accesses to this route, this method is chainable.
     *
     * @param {(Authenticator|null)} authenticator An instance of the authenticator class, it must extends the "Authenticator" class, if set to null, no authentication will be required.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid authenticator class instance is given.
     */
    setAuthenticator(authenticator){
        // TODO
        //if ( typeof authenticator !== 'object' || Object.getPrototypeOf(authenticator.constructor).name !== 'Authenticator' ){
        if ( typeof authenticator !== 'object' ){
            throw new InvalidArgumentException('Invalid authenticator.', 1);
        }
        this._authenticator = authenticator;
        return this;
    }

    /**
     * Returns the authenticator to use to authenticate an user whenever accesses to this route.
     *
     * @returns {(Authenticator|null)} An instance of the authenticator class or null if no authentication is required for this route.
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
     * @param {(string|null)} name A string representing the route name or null to remove current route name.
     *
     * @returns {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    setName(name){
        if ( name !== null && ( name === '' || typeof name !== 'string' ) ){
            throw new InvalidArgumentException('Invalid name.', 1);
        }
        this._name = name;
        return this;
    }

    /**
     * Returns the unique name associated to this route.
     *
     * @returns {(string|null)} A string containing the name or null if no name has been defined.
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
     * @param {(boolean|null)} auth If set to "true" and if an authenticator provider has been defined, user authentication will be required, if set to null, default value will be used instead.
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
     * @return {(boolean|null)} If authentication has been marked as required for this route will be returned "true", if no explicit authentication setting has been defined, null will be returned instead.
     */
    getAuth(){
        return this._auth === true ? true : ( this._auth === false ? false : null );
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
     * @returns {(RegExp|null)}
     */
    getRegex(){
        return this._regex;
    }

    /**
     * Returns the names of all the parameters required by this route.
     *
     * @return {Set<string>} A set containing the parameter names as strings.
     */
    getParameters(){
        return this._parameters;
    }

    /**
     * Returns the names of all the optional parameters accepted by this route.
     *
     * @return {Set<string>} A set containing the parameter names as strings.
     */
    getOptionalParameters(){
        return this._optionalParameters;
    }

    /**
     * Adds a filter for a given parameter, filter are basically regex used to validate parameters captured in request URL, this method is chainable.
     *
     * @param {string} parameter A string containing the parameter name, it can be both a required or an optional parameter but it must have been defined.
     * @param {(null|string|RegExp)} filter A string containing the pattern that will be used to validate the parameter value, alternatively a RegExp object can be used as well.
     *
     * @return {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     * @throws {InvalidArgumentException} If an invalid filter is given.
     */
    addParameterFilter(parameter, filter){
        if ( parameter === '' || typeof parameter !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        if ( ( filter === '' || typeof filter !== 'string' ) && !( filter instanceof RegExp ) ){
            throw new InvalidArgumentException('Invalid filter.', 2);
        }
        this._parameterFilters.set(parameter, filter);
        // Rebuilds route regex according to given filters.
        this._prepare();
        return this;
    }

    /**
     * Removes the filter that has been set on a given parameter, this method is chainable.
     *
     * @param {string} parameter A string containing the parameter name.
     *
     * @return {BaseRoute}
     */
    removeParameterFilter(parameter){
        if ( parameter === '' || typeof parameter !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        this._parameterFilters.delete(parameter);
        this._prepare();
        return this;
    }

    /**
     * Sets the filters of the parameters defined in route path, this method is chainable.
     *
     * @param {{string: string|RegExp}} filters An object having as key a string representing the parameter name and as value the filter as a string or a RegExp instance.
     *
     * @return {BaseRoute}
     *
     * @throws {InvalidArgumentException} If an invalid object containing the filters is given.
     */
    setParameterFilters(filters){
        if ( filters === null || typeof filters !== 'object' ){
            throw new InvalidArgumentException('Invalid filters object.', 1);
        }
        // Remove all the existing filters.
        this._parameterFilters = new Map();
        for ( const parameter in filters ){
            if ( filters.hasOwnProperty(parameter) ){
                if ( ( filters[parameter] !== '' && typeof filters[parameter] === 'string' ) || filters[parameter] instanceof RegExp ){
                    this._parameterFilters.set(parameter, filters[parameter]);
                }
            }
        }
        // Rebuilds route regex according to new filters.
        this._prepare();
        return this;
    }

    /**
     * Returns all the filters defined and that will be applied on parameters found.
     *
     * @return {Map<string, RegExp>} A map having as key the parameter name and as value the filter as a string or a RegExp instance, it depends on how it has been defined originally.
     */
    getParameterFilters(){
        return this._parameterFilters;
    }

    /**
     * Removes all the defined filter, this method is chainable.
     *
     * @return {BaseRoute}
     */
    dropParameterFilters(){
        this._parameterFilters = new Map();
        this._prepare();
        return this;
    }

    /**
     * Drops all cached data related to this route.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async invalidateCache(){
        //TODO: Add support to this method once tag support will be introduced in cache engine.
    }

    /**
     * Triggers this route, this method should be overridden.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @abstract
     * @async
     */
    async execute(request, response){}
}

module.exports = BaseRoute;