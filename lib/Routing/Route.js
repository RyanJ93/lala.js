'use strict';

// Including Lala's modules.
const ParameterizedRoute = require('./ParameterizedRoute');
const ControllerClosure = require('../Support/ControllerClosure');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {ParameterizedRouteOptions} RouteOptions Defines all the custom options that can be used in route definition.
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
     * Configure a given route instance according to the given options.
     *
     * @param {RouteOptions} options An object containing the configuration options the given route will be configured with.
     * @param {Route} instance A route instance.
     *
     * @protected
     */
    static _configureInstance(options, instance){
        super._configureInstance(options, instance);
    }

    /**
     * Generates an instance of this class based on given parameters and options.
     *
     * @param {string} method A string representing the HTTP method for this route.
     * @param {string} path A string containing the path to this route.
     * @param {(controllerCallback|ControllerClosure)} handler The callback function to invoke whenever this route gets triggered, alternatively, an instance of the "ControllerClosure" class can be used.
     * @param {?RouteOptions} [options] An optional object containing the additional options for the route that will be generated.
     *
     * @returns {Route} The instance of this class that has been generated and configured by this factory method.
     *
     * @throws {InvalidArgumentException} If an invalid method name is given.
     * @throws {InvalidArgumentException} If an unsupported method is given.
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     * @throws {InvalidArgumentException} If an invalid controller closure instance is given.
     * @throws {InvalidArgumentException} If the given options are not valid.
     */
    static craft(method, path, handler, options = null){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 1);
        }
        const route = new Route(method, path, handler);
        if ( options !== null ){
            Route._configureInstance(options, route);
        }
        return route;
    }

    /**
     * The class constructor.
     *
     * @param {string} method A string representing the HTTP method for this route.
     * @param {string} path A string containing the path to this route.
     * @param {(controllerCallback|ControllerClosure)} handler The callback function to invoke whenever this route gets triggered, alternatively, an instance of the "ControllerClosure" class can be used.
     *
     * @throws {InvalidArgumentException} If an invalid method name is given.
     * @throws {InvalidArgumentException} If an unsupported method is given.
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     * @throws {InvalidArgumentException} If an invalid controller closure instance is given.
     */
    constructor(method, path, handler){
        super();

        /**
         * @type {?controllerCallback} [_handler] The callback function to invoke whenever this route gets triggered.
         *
         * @protected
         */
        this._handler = null;

        /**
         * @type {?ControllerClosure} [_controllerClosure] An instance of the "ControllerClosure" class representing the controller method to invoke whenever this route gets triggered.
         *
         * @protected
         */
        this._controllerClosure = null;

        // Set given parameters.
        this.setMethod(method).setPath(path);
        if ( typeof handler === 'function' ){
            this.setHandler(handler);
        }else{
            this.setControllerClosure(handler);
        }
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
        this._controllerClosure = null;
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
     * Sets the controller to invoke whenever this route gets triggered, this method is chainable.
     *
     * @param {ControllerClosure} controllerClosure An instance of the "ControllerClosure" class representing the controller method the class it belongs to.
     *
     * @returns {Route}
     *
     * @throws {InvalidArgumentException} If an invalid controller closure instance is given.
     */
    setControllerClosure(controllerClosure){
        if ( !( controllerClosure instanceof ControllerClosure ) ){
            throw new InvalidArgumentException('Invalid controller closure.', 1);
        }
        this._controllerClosure = controllerClosure;
        this._handler = null;
        return this;
    }

    /**
     * Returns the controller to invoke whenever this route gets triggered.
     *
     * @returns {?ControllerClosure} An instance of the "ControllerClosure" class representing the controller or null if none has been defined.
     */
    getControllerClosure(){
        return this._controllerClosure;
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
        if ( this._handler !== null ){
            // Execute the controller function.
            result = this._handler(request, response);
            if ( result instanceof Promise ){
                result = await result;
            }
        }else if ( this._controllerClosure !== null ){
            // Run the controller defined in the given controller closure.
            result = this._controllerClosure.run(request, response);
            if ( result instanceof Promise ){
                result = await result;
            }
        }
        return result;
    }
}

module.exports = Route;
