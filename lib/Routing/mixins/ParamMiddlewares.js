'use strict';

// Including Lala's modules.
const Mixin = require('../../Support/Mixin');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @typedef {Object} ParamMiddleware The structure where middleware function for parameters are stored in.
 *
 * @property {Map<string, function>} handlers An object having as key the middleware identifier and as value the handler function.
 * @property {Map<string, Set<string>>} parameters An object having as key the parameter name and as value a sequential array containing all the identifiers of the middlewares that handles this parameter.
 */

/**
 * @typedef {Object} ParamMiddlewareDefinition Representing the structure of the object to pass in order to define a middleware whenever setting middlewares in bulk.
 *
 * @property {string} identifier A string containing the unique middleware name.
 * @property {paramMiddlewareHandler} handler The callback function that implements the middleware.
 * @property {?(string|string[])} [parameters] One or multiple strings as an array, containing the name of the parameters this middleware can be triggered by, if set to null any param will trigger it on.
 */

/**
 * @callback paramMiddlewareHandler The callback function that implements the middleware behaviour.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 * @param {Object.<string, string>} parameters An object containing all the parameters found while processing current client request and having as key the param name and as value its value as a string.
 * @param {paramMiddlewareNextHandler} next A function to invoke in order to keep the middleware chain running, if not invoked, the middleware chain will be interrupted.
 *
 * @returns {Promise<void>}
 *
 * @async
 */

/**
 * @callback paramMiddlewareNextHandler The function to invoke in order to keep the middlewares chain under execution.
 *
 * @async
 */

/**
 * Provides middleware capabilities.
 *
 * @mixin
 */
class ParamMiddlewares extends Mixin {
    /**
     * The class constructor.
     */
    constructor() {
        super();

        /**
         * @type {ParamMiddleware} _paramMiddlewares An object containing all the middlewares used to mutate and handle parameters.
         *
         * @protected
         */
        this._paramMiddlewares = {
            handlers: new Map(),
            parameters: new Map()
        };
    }

    /**
     * Adds a middleware function that will be invoked to handle the given parameters when found in a request, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware unique identifier.
     * @param {paramMiddlewareHandler} handler The callback function that implements the middleware.
     * @param {?(string|string[])} [parameters] The name of the parameter this middleware will be triggered by, multiple parameters can be passed as an array, if set to null, it will be triggered by any parameter.
     *
     * @returns {ParamMiddlewares}
     *
     * @throws {InvalidArgumentException} If an invalid middleware identifier is given.
     * @throws {InvalidArgumentException} If an invalid handler function is given.
     * @throws {InvalidArgumentException} If no valid parameter is given.
     */
    addParamMiddleware(identifier, handler, parameters = null){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid middleware identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid middleware handler function.', 2);
        }
        if ( parameters !== null && ( typeof parameters !== 'string' || parameters === '' ) && !Array.isArray(parameters) ){
            throw new InvalidArgumentException('Invalid parameters.', 3);
        }
        // Creating the object that will represent this middleware.
        const middleware = {
            handler: handler,
            parameters: new Set()
        };
        if ( parameters === null || typeof parameters === 'string' ){
            // If parameters has been set to null, this meddleware should be executed for all parameters, set the parameter name to "*".
            parameters = parameters === null ? ['*'] : [parameters];
        }
        // Validating given parameters.
        const length = parameters.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( parameters[i] !== '' && typeof parameters[i] === 'string' ){
                if ( !this._paramMiddlewares.parameters.has(parameters[i]) ){
                    // Create an empty set that will contains the list of all the identifiers of the middlewares to run for this parameter.
                    this._paramMiddlewares.parameters.set(parameters[i], new Set());
                }
                // Attach the reference to this middleware for current parameter.
                this._paramMiddlewares.parameters.get(parameters[i]).add(identifier);
                middleware.parameters.add(parameters[i]);
            }
        }
        if ( middleware.parameters.size !== 0 ){
            // If this middleware has been attached to at least one parameter, then register it to the list of all the available middlewares.
            this._paramMiddlewares.handlers.set(identifier, middleware);
        }
        return this;
    }

    /**
     * Removes a middleware, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware unique identifier.
     *
     * @returns {ParamMiddlewares}
     *
     * @throws {InvalidArgumentException} If an invalid middleware identifier is given.
     */
    removeParamMiddleware(identifier){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid middleware identifier.', 1);
        }
        const middleware = this._paramMiddlewares.handlers.get(identifier);
        if ( typeof middleware !== 'undefined' ){
            // Iterate over all the parameters in order to find out which one must be removed from the index.
            for ( const param of middleware.parameters ){
                // Get the list of all the middlewares to execute for this parameter.
                const list = this._paramMiddlewares.parameters.get(param);
                if ( typeof list !== 'undefined' ){
                    // Remove current middleware's identifier from the list associated to this parameter.
                    list.delete(identifier);
                    if ( list.size === 0 ){
                        // If the list of this parameter is now empty, remove it.
                        this._paramMiddlewares.parameters.delete(param);
                    }
                }
            }
            // Remove the middleware callback function.
            this._paramMiddlewares.handlers.delete(identifier);
        }
        return this;
    }

    /**
     * Drops all the defined middleware functions invoked to handle request parameters, this method is chainable.
     *
     * @returns {ParamMiddlewares}
     */
    dropParamMiddlewares(){
        this._paramMiddlewares = {
            handlers: new Map(),
            parameters: new Map()
        };
        return this;
    }

    /**
     * Sets the middlewares to execute in order to process request parameters, this method is chainable.
     *
     * @param {ParamMiddlewareDefinition[]} middlewares An array of objects representing the middlewares to set.
     *
     * @returns {ParamMiddlewares}
     *
     * @throws {InvalidArgumentException} If an invalid array of middlewares is given.
     */
    setParamMiddlewares(middlewares){
        if ( !Array.isArray(middlewares) ){
            throw new InvalidArgumentException('Invalid middlewares array.', 1);
        }
        // Remove current middlewares.
        this.dropParamMiddlewares();
        const length = middlewares.length;
        // Validate and adds given middlewares.
        for ( let i = 0 ; i < length ; i++ ){
            if ( middlewares[i].hasOwnProperty('handler') && typeof middlewares[i].handler === 'function' && middlewares[i].hasOwnProperty('identifier') && typeof middlewares[i].identifier === 'string' ){
                if ( middlewares[i].parameters !== null && ( typeof middlewares[i].parameters !== 'string' || middlewares[i].parameters === '' ) && !Array.isArray(middlewares[i].parameters) ){
                    // Add current middleware.
                    this.addParamMiddleware(middlewares[i].identifier, middlewares[i].handler, middlewares[i].parameters);
                }
            }
        }
        return this;
    }

    /**
     * Returns all the middlewares that are going to be executed for a given parameter name.
     *
     * @param {(string|string[])} name A string containing the name of the parameter, suggestion, pass "*" to get only the global ones, multiple names are also accepted as an array.
     * @param {boolean} [globals=false] If set to "true" middlewares to execute for any parameter will be also included.
     *
     * @returns {Map<string, function>} A map having as key the middleware identifier and as value the handler function.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     */
    getMiddlewaresByParameterName(name, globals = false){
        // Get all the middlewares for the given parameter name.
        const middlewares = this.getMiddlewaresByParameterNameAsObject(name, globals);
        // Convert the obtained object into a map.
        return new Map(Object.entries(middlewares));
    }

    /**
     * Returns all the middlewares that are going to be executed for a given parameter name.
     *
     * @param {(string|string[])} name A string containing the name of the parameter, suggestion, pass "*" to get only the global ones, multiple names are also accepted as an array.
     * @param {boolean} [globals=false] If set to "true" middlewares to execute for any parameter will be also included.
     *
     * @returns {Object.<string, function>} An object having as key the middleware identifier and as value the handler function.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     */
    getMiddlewaresByParameterNameAsObject(name, globals = false){
        if ( !Array.isArray(name) && ( name === '' || typeof name !== 'string' ) ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        if ( !Array.isArray(name) ){
            name = [name];
        }
        if ( globals === true ){
            name.push('*');
        }
        const results = {};
        // Loop all parameters which at least a middleware has been defined for.
        for ( const [parameter, identifiers] of this._paramMiddlewares.parameters ){
            if ( name.indexOf(parameter) !== -1 ){
                for ( const identifier of identifiers ){
                    results[identifier] = this._paramMiddlewares.handlers.get(identifier);
                }
            }
        }
        return results;
    }

    /**
     * Returns the middleware functions that will be invoked to handle the given parameters when found in a request.
     *
     * @return {Map<string, middlewareHandler>} A map having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (an array of strings containing the parameters that the middleware is applied to).
     */
    getParamMiddlewares(){
        return this._paramMiddlewares.handlers;
    }

    /**
     * Returns the middleware functions that will be invoked to handle the given parameters when found in a request.
     *
     * @return {Object.<string, middlewareHandler>} An object having as key the middleware identifier and as value an object containing the properties "handler" (the middleware's function) and "param" (an array of strings containing the parameters that the middleware is applied to).
     */
    getParamMiddlewaresAsObject(){
        return Object.fromEntries(this._paramMiddlewares.handlers.entries());
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
    async runParamMiddlewares(request, response){
        let result = true;
        if ( request.hasOwnProperty('resolvedRoute') && request.resolvedRoute !== null && typeof request.resolvedRoute === 'object' ){
            const parameters = request.resolvedRoute.getParameters();
            // Get the middlewares to execute according to request's parameters.
            const middlewares = this.getMiddlewaresByParameterNameAsObject(Object.keys(parameters), true);
            const functions = Object.values(middlewares);
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
                        await functions[pointer](request, response, parameters, next);
                    }
                };
                // Get the first available function.
                while ( pointer < length && typeof functions[pointer] !== 'function' ){
                    pointer++;
                }
                if ( pointer < length ){
                    await functions[pointer](request, response, parameters, next);
                }
                result = length <= pointer;
            }
        }
        return result;
    }
}

module.exports = ParamMiddlewares;
