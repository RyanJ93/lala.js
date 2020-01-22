'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const HTTPCookieProcessor = require('../../HTTP/HTTPCookieProcessor');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "HTTPCookieProcessor" based on given configuration.
 */
class HTTPCookieProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        this._properties = HTTPCookieProcessor.getDefaultConfiguration();

        /**
         * @type {?string} [_originalEncryptionKey] A string containing the encryption key to use to encrypt cookies.
         *
         * @protected
         */
        this._originalEncryptionKey = null;
    }

    /**
     * Sets the name of the cookie that should contain the language to use for current client request, this method is chainable.
     *
     * @param name A string containing the name of the cookie or null if language should not be changes by cookies.
     *
     * @returns {HTTPCookieProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    setLanguageCookieName(name){
        if ( name !== null && typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        this._properties.languageCookieName = name === '' ? null : name;
        return this;
    }

    /**
     * Returns the name of the cookie that should contain the language to use for current client request.
     *
     * @returns {?string} A string containing the name of the cookie or null if no cookie name has been defined.
     */
    getLanguageCookieName(){
        return this._properties.languageCookieName;
    }

    /**
     * Sets if cookies should be encrypted before being saved on the client side, this method is chainable.
     *
     * @param {boolean} encryption If set to "true" cookies will be encrypted.
     *
     * @returns {HTTPCookieProcessorFactory}
     */
    setEncryption(encryption){
        this._properties.encryption = encryption === true;
        return this;
    }

    /**
     * Returns if cookies will be encrypted before being saved on the client side.
     *
     * @returns {boolean} If cookies are going to be encrypted will be returned "true".
     */
    getEncryption(){
        return this._properties.encryption === true;
    }

    /**
     * Sets the encryption key to use to encrypt cookies, this method is chainable.
     *
     * @param {?string} encryptionKey A string containing the encryption key.
     *
     * @returns {HTTPCookieProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid encryption key is given.
     */
    setEncryptionKey(encryptionKey){
        if ( encryptionKey !== null && ( encryptionKey === '' || typeof encryptionKey !== 'string' ) ){
            throw new InvalidArgumentException('Invalid encryption key.', 1);
        }
        this._originalEncryptionKey = encryptionKey;
        this._properties.encryptionKey = HTTPCookieProcessor.prepareEncryptionKey(this._originalEncryptionKey, this._properties.encryptionAlgorithm);
        return this;
    }

    /**
     * Returns the encryption key being used to encrypt cookies.
     *
     * @returns {?string} A string containing the encryption key or null if no e
     */
    getEncryptionKey(){
        return this._originalEncryptionKey;
    }

    /**
     * Sets the encryption algorithm to use to encrypt cookies, this method is chainable.
     *
     * @param {string} encryptionAlgorithm A string containing the name of the encryption algorithm to use.
     *
     * @returns {HTTPCookieProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid or unsupported algorithm name is given.
     */
    setEncryptionAlgorithm(encryptionAlgorithm){
        if ( !HTTPCookieProcessor.isSupportedEncryptionAlgorithm(encryptionAlgorithm) ){
            throw new InvalidArgumentException('Invalid or unsupported encryption algorithm.', 1);
        }
        this._properties.encryptionAlgorithm = encryptionAlgorithm;
        this._properties.encryptionKey = HTTPCookieProcessor.prepareEncryptionKey(this._originalEncryptionKey, this._properties.encryptionAlgorithm);
        return this;
    }

    /**
     * Returns the encryption algorithm to use to encrypt cookies.
     *
     * @returns {string} A string containing the name of the encryption algorithm defined.
     */
    getEncryptionAlgorithm(){
        return this._properties.encryptionAlgorithm;
    }

    /**
     * Generates an instance of the class "HTTPCookieProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {HTTPCookieProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const cookieProcessor = new HTTPCookieProcessor();
        // Configuring class instance.
        cookieProcessor.configure(this._properties);
        return cookieProcessor;
    }
}

module.exports = HTTPCookieProcessorFactory;
