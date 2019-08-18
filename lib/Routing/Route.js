'use strict';

// Including Lala's modules.
const ParameterizedRoute = require('./ParameterizedRoute');
const Authenticator = require('../Authenticator/Authenticator');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef RouteOptions Defines all the custom options that can be used in route definition.
 *
 * @property {?Object.<string, middlewareHandler>} [middlewares] An object containing the middleware functions to execute before invoking the function handler.
 * @property {?Authenticator} [authenticator] An instance of the authenticator class, it must extends the "Authenticator" class, if set to null, no authentication will be required.
 * @property {?string} name A string containing an unique name for this route.
 * @property {?boolean} [auth] If set to "true" it means that user authentication is required in order to access to this route, if set to "false" any other authentication layer will be ignored for this route.
 * @property {?Object.<string, (string|RegExp)>} filters An object having as value a string or a regex containing the condition to apply to the corresponding parameter used as item key.
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
        const auth = options.hasOwnProperty('auth') ? ( options.auth === true ? true : ( options.auth === false ? false : null ) ) : null;
        route.setAuth(auth);
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
        return typeof this._handler === 'function' ? await this._handler(request, response) : null;
    }
}

module.exports = Route;
