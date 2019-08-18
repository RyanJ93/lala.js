'use strict';

// Including Lala's modules.
const Mixin = require('../Support/Mixin');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @callback middlewareHandler The callback function that implements the middleware behaviour.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 * @param {middlewareNextHandler} next A function to invoke in order to keep the middleware chain running, if not invoked, the middleware chain will be interrupted.
 *
 * @returns {Promise<void>}
 *
 * @async
 */

/**
 * @callback middlewareNextHandler The function to invoke in order to keep the middlewares chain under execution.
 *
 * @async
 */

/**
 * Provides middleware capabilities.
 *
 * @mixin
 */
class Middlewares extends Mixin {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {Map<string, middlewareHandler>} _middlewares A map having as key a string containing the middleware identifier and as value the function to execute when the route gets triggered.
         *
         * @protected
         */
        this._middlewares = new Map();
    }

    /**
     * Adds a middleware function to the list of the functions to invoke whenever this route gets triggered, this method is chainable.
     *
     * @param {string} identifier A string representing the middleware identifier, it must be unique.
     * @param {middlewareHandler} handler The callback function to invoke whenever the middleware gets fired.
     *
     * @returns {Middlewares}
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
     * @returns {Middlewares}
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
     * @param {Object.<string, middlewareHandler>} middlewares An object having as ket the middleware unique identifier and as value the handler function.
     *
     * @returns {Middlewares}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middleware object.', 1);
        }
        // Drop all the middleware currently in list.
        this._middlewares.clear();
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
     * @returns {Middlewares}
     */
    dropMiddlewares(){
        this._middlewares.clear();
        return this;
    }

    /**
     * Returns all the middlewares that have been defined.
     *
     * @returns {Map<string, middlewareHandler>} A map containing the middlewares and having as key a string representing the middleware unique identifier and as value the handler function.
     */
    getMiddlewares(){
        return this._middlewares;
    }

    /**
     * Returns all the middlewares that have been defined.
     *
     * @returns {Object.<string, middlewareHandler>} An object containing the middlewares and having as key a string representing the middleware unique identifier and as value the handler function.
     */
    getMiddlewaresAsObject(){
        return Object.fromEntries(this._middlewares.entries());
    }

    /**
     * Executes all the middlewares that have been defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If the whole middleware chain gets executed will be returned "true", if it gets interrupted by some middleware will be returned "false".
     *
     * @async
     */
    async runMiddlewares(request, response){
        let result = true;
        const functions = Array.from(this._middlewares.values());
        const length = functions.length;
        if ( length !== 0 ){
            let pointer = 0;
            // Prepare the function that allow other middlewares to be executed is current request should continue.
            const next = async () => {
                pointer++;
                // Pick the first next function available.
                while ( pointer < length && typeof functions[pointer] !== 'function' ){
                    pointer++;
                }
                if ( pointer < length ){
                    await functions[pointer](request, response, next);
                }
            };
            // Get the first available function.
            while ( pointer < length && typeof functions[pointer] !== 'function' ){
                pointer++;
            }
            if ( pointer < length ){
                await functions[pointer](request, response, next);
            }
            result = length <= pointer;
        }
        return result;
    }
}

module.exports = Middlewares;
