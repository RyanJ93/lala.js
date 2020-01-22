'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const AuthorizationProcessor = require('../AuthorizationProcessor');
const CSRFTokenStorage = require('../../support/CSRFTokenStorage');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

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
     * Sets the object that will be used to store clients' CSRF token, this method is chainable.
     *
     * @param {?CSRFTokenStorage} storage An instance of the class "CSRFTokenStorage" or null if CSRF token should not be handled.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid storage object is given.
     */
    setCSRFTokenStorage(storage){
        if ( storage !== null && !( storage instanceof CSRFTokenStorage ) ){
            throw new InvalidArgumentException('Invalid storage object.', 1);
        }
        this._properties.CSRFTokenStorage = storage;
        return this;
    }

    /**
     * Returns the object being used used to store clients' CSRF token.
     *
     * @returns {?CSRFTokenStorage} An instance of the class "CSRFTokenStorage" or null if CSRF token should not be handled.
     */
    getCSRFTokenStorage(){
        return this._properties.CSRFTokenStorage;
    }

    /**
     * Sets the name of the field that should contain the client provided CSRF token to verify, this method is chainable.
     *
     * @param {?string} name A string containing the field name or null if no CSRF token should be checked through parameters.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid field name is given.
     */
    setCSRFFieldName(name){
        if ( name !== null && ( name === '' || typeof name !== 'string' ) ){
            throw new InvalidArgumentException('Invalid field name.', 1);
        }
        this._properties.CSRFFieldName = name;
        return this;
    }

    /**
     * Returns the name of the field that should contain the client provided CSRF token to verify.
     *
     * @returns {?string} A string containing the field name or null if no CSRF token should be checked through parameters.
     */
    getCSRFFieldName(){
        return this._properties.CSRFFieldName;
    }

    /**
     * Sets the name of the HTTP header that should contain the client provided CSRF token to verify, this method is chainable.
     *
     * @param {?string} name A string containing the header name or null if no CSRF token should be checked through headers.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid header name is given.
     */
    setCSRFHeaderName(name){
        if ( name !== null && ( name === '' || typeof name !== 'string' ) ){
            throw new InvalidArgumentException('Invalid header name.', 1);
        }
        this._properties.CSRFHeaderName = name;
        return this;
    }

    /**
     * Returns the name of the HTTP header that should contain the client provided CSRF token to verify.
     *
     * @returns {?string} A string containing the header name or null if no CSRF token should be checked through headers.
     */
    getCSRFHeaderName(){
        return this._properties.CSRFHeaderName;
    }

    /**
     * Sets the TTL to apply to the generated CSRF tokens, this method is chainable.
     *
     * @param {?number} ttl An integer number greater than zero representing the amount of seconds generated tokens should live for, if null they will last forever.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid TTL value is given.
     */
    setCSRFTokenTTL(ttl){
        if ( ttl !== null && ( isNaN(ttl) || ttl <= 0 ) ){
            throw new InvalidArgumentException('Invalid TTL value.', 1);
        }
        this._properties.CSRFTokenTTL = ttl;
        return this;
    }

    /**
     * Return the TTL to apply to the generated CSRF tokens
     *
     * @returns {?number} An integer number greater than zero representing the amount of seconds generated tokens should live for, if null they should last forever.
     */
    getCSRFTokenTTL(){
        return this._properties.CSRFTokenTTL;
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
