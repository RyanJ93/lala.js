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
     * Sets the name of the cookie that contains the CSRF token ID on the client side, this method is chainable.
     *
     * @param {string} CSRFIDCookieName A string containing the cookie name.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    setCSRFIDCookieName(CSRFIDCookieName){
        if ( CSRFIDCookieName === '' || typeof CSRFIDCookieName !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        this._properties.CSRFIDCookieName = CSRFIDCookieName;
        return this;
    }

    /**
     * Returns the name of the cookie that contains the CSRF token on the client side.
     *
     * @returns {string} A string containing the cookie name.
     */
    getCSRFIDCookieName(){
        return this._properties.CSRFIDCookieName;
    }

    /**
     * Sets some custom options to consider when saving the cookie that contains the CSRF token ID on the client side, this method is chainable.
     *
     * @param {?CookieOptions} CSRFIDCookieOptions An object containing the options.
     *
     * @returns {AuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setCSRFIDCookieOptions(CSRFIDCookieOptions){
        if ( typeof CSRFIDCookieOptions !== 'object' ){
            throw new InvalidArgumentException('Invalid cookie options.', 1);
        }
        this._properties.CSRFIDCookieOptions = CSRFIDCookieOptions;
        return this;
    }

    /**
     * Returns all the custom options that have been defined for the cookie that contains the CSRF token ID on the client side.
     *
     * @returns {?CookieOptions} An object containing the options or nullif no custom option has been defined.
     */
    getCSRFIDCookieOptions(){
        return this._properties.CSRFIDCookieOptions;
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
