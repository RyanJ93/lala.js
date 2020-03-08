'use strict';

// Including Lala's modules.
const ParameterizedRoute = require('./ParameterizedRoute');
const Authenticator = require('../Authenticator/Authenticator');
const Form = require('../Form/Form');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {ParameterizedRouteOptions} RouteOptions Defines all the custom options that can be used in route definition.
 *
 * @param {boolean} [CSRFTokenRequired=false] If set to "true" a CSRF token must be provided by the client side in order to continue the request processing.
 */

/**
 * @callback controllerCallback
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 *
 * @returns {Promise<*>} Some data to send back to the connected client as the request response.
 *
 * @async
 */

/**
 * This class implements the standard route that allows to deal with the MVC pattern.
 */
class Route extends ParameterizedRoute {
    /**
     * Generates an instance of this class based on given parameters and options.
     *
     * @param {string} method A string representing the HTTP method for this route.
     * @param {string} path A string containing the path to this route.
     * @param {controllerCallback} handler The callback function to invoke whenever this route gets triggered.
     * @param {?RouteOptions} [options] An optional object containing the additional options for the route that will be generated.
     *
     * @returns {Route} The instance of this class that has been generated and configured by this factory method.
     */
    static craft(method, path, handler, options = null){
        const route = new Route(method, path, handler);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        if ( options.hasOwnProperty('middlewares') && options.middlewares !== null && typeof options.middlewares === 'object' ){
            route.setMiddlewares(options.middlewares);
        }
        if ( options.hasOwnProperty('authenticator') && options.authenticator instanceof Authenticator ){
            route.setAuthenticator(options.authenticator);
        }
        if ( options.hasOwnProperty('name') && options.name !== '' && typeof options.name === 'string' ){
            route.setName(options.name);
        }
        if ( options.hasOwnProperty('filters') && options.filters !== null && typeof options.filters === 'object' ){
            route.setParameterFilters(options.filters);
        }
        if ( options.hasOwnProperty('language') && options.language !== '' && typeof options.language === 'string' ){
            route.setLanguage(options.language);
        }
        if ( options.hasOwnProperty('permissions') ){
            if ( options.permissions instanceof Set ){
                route.setPermissions(options.permissions);
            }else if ( Array.isArray(options.permissions) ){
                route.setPermissionsAsArray(options.permissions);
            }
        }
        if ( options.hasOwnProperty('policies') ){
            if ( options.policies instanceof Map ){
                route.setPolicies(options.policies);
            }else if ( options.policies !== null && typeof options.policies === 'object' ){
                route.setPoliciesAsObject(options.policies);
            }
        }
        if ( options.hasOwnProperty('paramMiddlewares') && Array.isArray(options.paramMiddlewares) ){
            route.setParamMiddlewares(options.paramMiddlewares);
        }
        if ( options.hasOwnProperty('form') && options.form.prototype instanceof Form ){
            route.setForm(options.form);
        }
        const auth = options.hasOwnProperty('auth') ? ( options.auth === true ? true : ( options.auth === false ? false : null ) ) : null;
        route.setAuth(auth);
        route.setCSRFTokenRequired(options.hasOwnProperty('CSRFTokenRequired') && options.CSRFTokenRequired === true);
        return route;
    }

    /**
     * The class constructor.
     *
     * @param {string} method A string representing the HTTP method for this route.
     * @param {string} path A string containing the path to this route.
     * @param {controllerCallback} handler The callback function to invoke whenever this route gets triggered.
     */
    constructor(method, path, handler){
        super();

        /**
         * @type {?controllerCallback} _handler The callback function to invoke whenever this route gets triggered.
         *
         * @protected
         */
        this._handler = null;

        /**
         * @type {boolean} [_CSRFTokenRequired=false] If set to "true" a CSRF token must be provided by the client side in order to continue the request processing.
         *
         * @protected
         */
        this._CSRFTokenRequired = false;

        // Set given parameters.
        this.setMethod(method).setPath(path).setHandler(handler);
        // Register this route into the global index.
        this._register();
    }

    /**
     * Sets the handler function that will be invoked whenever this route gets triggered, this method is chainable.
     *
     * @param {controllerCallback} handler The callback function to invoke.
     *
     * @returns {Route}
     *
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    setHandler(handler){
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        this._handler = handler;
        return this;
    }

    /**
     * Returns the handler function to invoke whenever this route gets triggered.
     *
     * @returns {controllerCallback} The callback function to invoke.
     */
    getHandler(){
        return this._handler;
    }

    /**
     * Sets if a CSRF token must be provided by the client side in order to process this route, this method is chainable.
     *
     * @param CSRFTokenRequired If set to "true" client side must provide a CSRF token.
     *
     * @returns {Route}
     */
    setCSRFTokenRequired(CSRFTokenRequired){
        this._CSRFTokenRequired = CSRFTokenRequired === true;
        return this;
    }

    /**
     * Returns if a CSRF token must be provided by the client side in order to process this route.
     *
     * @returns {boolean} If a CSRF is required will be returned "true".
     */
    getCSRFTokenRequired(){
        return this._CSRFTokenRequired === true;
    }

    /**
     * Executes the callback function that has been defined as the route handler and then returns its output.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<*>} Some data to send back to the connected client as the request response.
     *
     * @async
     */
    async execute(request, response){
        let result = null;
        // Validate incoming data according to the defined form.
        await this._processForm(request, response);
        if ( typeof this._handler === 'function' ){
            // Execute the controller function.
            result = this._handler(request, response);
            if ( result instanceof Promise ){
                result = await result;
            }
        }
        return result;
    }
}

module.exports = Route;
