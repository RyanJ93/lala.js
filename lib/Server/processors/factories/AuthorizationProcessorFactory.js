'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const AuthorizationProcessor = require('../AuthorizationProcessor');

/**
 * Allows the generation and configuration of instances of the class "AuthorizationProcessor" based on given configuration.
 */
class AuthorizationProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = AuthorizationProcessor.getDefaultConfiguration();
    }

    /**
     * Adds one middleware function invoked whenever a new client establishes a connection, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {middlewareHandler} handler The callback function that handles the middleware.
     *
     * @return {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     */
    addAccessMiddleware(identifier, handler){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        this._properties.accessMiddlewares.set(identifier, handler);
        return this;
    }

    /**
     * Removes one of the middleware function invoked whenever a new client establishes a connection, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    removeAccessMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        this._properties.accessMiddlewares.delete(identifier);
        return this;
    }

    /**
     * Drops all the defined middleware functions, this method is chainable.
     *
     * @returns {AuthorizationProcessorFactory}
     */
    dropAccessMiddlewares(){
        this._properties.accessMiddlewares = new Map();
        return this;
    }

    /**
     * Sets the access middleware function to invoke whenever a new client establishes a connection.
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    setAccessMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        this._properties.accessMiddlewares = new Map();
        for ( let identifier in middlewares ){
            if ( !middlewares.hasOwnProperty(identifier) ){
                continue
            }
            if ( typeof identifier === 'string' && identifier !== '' && typeof middlewares === 'function' ){
                this._properties.accessMiddlewares.set(identifier, middlewares[identifier]);
            }
        }
        return this;
    }

    /**
     * Returns all the defined middleware functions invoked whenever a new client establishes a connection.
     *
     * @returns
     */
    getAccessMiddlewares(){
        return this._properties.accessMiddlewares;
    }

    /**
     * Generates an instance of the class "AuthorizationProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {AuthorizationProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const authorizationProcessor = new AuthorizationProcessor();
        // Configuring class instance.
        authorizationProcessor.configure(this._properties);
        return authorizationProcessor;
    }
}

module.exports = AuthorizationProcessorFactory;
