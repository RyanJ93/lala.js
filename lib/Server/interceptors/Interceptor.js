'use strict';

// Including Lala's modules.
const {
    RuntimeException
} = require('../../Exceptions');

/**
 * @callback InterceptorImplementation The callback function that implements the interceptor's logic.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 *
 * @returns {Promise<boolean>} If client request should continue "true" must be returned, otherwise client request will be blocked.
 *
 * @async
 */

/**
 * Allows to implement interceptors.
 *
 * @abstract
 */
class Interceptor {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor() {
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Interceptor' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {Object.<string, InterceptorImplementation>} _breakpoints An object containing the callback functions to execute for each request processing step, step names are used as the entries key.
         *
         * @protected
         */
        this._breakpoints = Object.create(null);
    }

    /**
     * Returns all the breakpoints this interceptor is meant to handle.
     *
     * @returns {string[]} An array of strings containing the breakpoint names.
     */
    getSupportedBreakpoints(){
        return Object.keys(this._breakpoints);
    }

    /**
     * Executes the callback function defined for a given breakpoint name.
     *
     * @param {string} breakpoint A string containing the name of the request processing breakpoint.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If client request processing can continue will be returned "true", otherwise "false" and client request should be immediately blocked.
     *
     * @async
     */
    async intercept(breakpoint, request, response){
        return typeof this._breakpoints[breakpoint] === 'function' ? ( await this._breakpoints[breakpoint](request, response) ) : true;
    }
}

module.exports = Interceptor;
