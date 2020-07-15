'use strict';

// Including native modules.
const http = require('http');
const crypto = require('crypto');

// Including Lala's modules.
const Processor = require('../Processor');
const Cookie = require('../../../Types/Cookie');
const HelperRepository = require('../../../Helpers/HelperRepository');
const {
    InvalidArgumentException,
    BadMethodCallException
} = require('../../../Exceptions');

/**
 * @typedef {Object} HTTPCookieProcessorConfiguration An object containing all the properties of this class that will be setup on class has been instanced.
 *
 * @property {?string} [languageCookieName="lala.js::lang"] A string containing the name of the cookie that will contains language declaration for this client request.
 * @property {boolean} [encryption=false] If set to "true" it means that cookies must be encrypted before being stored on the client side.
 * @property {?Buffer} [encryptionKey] A buffer representing the encryption key, keys must be converted from string to Buffer using the "prepareEncryptionKey" method.
 * @property {string} [encryptionAlgorithm="aes-256-cbc"] A string containing the name of the encryption algorithm tu use.
 */

/**
 * Allows to process and handle HTTP cookies.
 */
class HTTPCookieProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPCookieProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            languageCookieName: 'lala.js::lang',
            encryption: false,
            encryptionKey: null,
            encryptionAlgorithm: 'aes-256-cbc'
        };
    }

    /**
     * Checks if a given algorithm is supported and can be used to encrypt cookies.
     *
     * @param {string} algorithm A string containing the algorithm name, currently only aes-*-cbc algorithms are supported.
     *
     * @returns {boolean} If the given algorithm is supported will be returned "true".
     */
    static isSupportedEncryptionAlgorithm(algorithm){
        return algorithm !== '' && HTTPCookieProcessor.SUPPORTED_ENCRYPTION_ALGORITHMS.hasOwnProperty(algorithm);
    }

    /**
     * Generates an hash from the encryption key defined according to the encryption algorithm defined.
     *
     * @param {string} key A string containing the encryption key to process.
     * @param {string} algorithm A string containing the name of the algorithm this key will be used with.
     *
     * @returns {Buffer} A buffer representing the key after being hashed using the "scrypt" algorithm.
     *
     * @throws {InvalidArgumentException} If an invalid encryption key is given.
     * @throws {InvalidArgumentException} If an invalid or unsupported encryption algorithm is given.
     */
    static prepareEncryptionKey(key, algorithm){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid encryption key.', 1);
        }
        if ( !HTTPCookieProcessor.isSupportedEncryptionAlgorithm(algorithm) ){
            throw new InvalidArgumentException('Invalid encryption algorithm.', 2);
        }
        // Get the key length required according to the algorithm defined.
        const keyLength = HTTPCookieProcessor.SUPPORTED_ENCRYPTION_ALGORITHMS[algorithm][1];
        // Generate the hash from the encryption key using the "scrypt" hashing algorithm.
        return crypto.scryptSync(key, '', keyLength);
    }

    /**
     * Generates the header string according to each cookie staged to be sent to the client.
     *
     * @return {string[]} A sequential array of strings containing the format used to define and store defined cookies according to the HTTP protocol.
     *
     * @protected
     */
    _generateHeader(){
        const cookies = [];
        for ( const [name, cookie] of this._stagedCookies.entries() ){
            let cookieValue = cookie.getEncodedValue();
            if ( this._encryption === true && this._encryptionKey !== null ){
                // Cookie encryption has been turned on, encrypt current cookie value.
                cookieValue = this._encrypt(cookieValue);
            }
            let header = name + '=' + cookieValue + '; Version=1';
            const expire = cookie.getExpire();
            if ( expire !== null ){
                header += '; Expires=' + expire.toUTCString();
            }
            const domains = cookie.getDomains();
            if ( domains !== null ){
                header += '; Domain=' + domains[0];
            }
            const path = cookie.getPath();
            if ( path !== null ){
                header += '; Path=' + path;
            }
            if ( cookie.getSecure() ){
                header += '; Secure';
            }
            if ( cookie.getHTTPOnly() ){
                header += '; HttpOnly';
            }
            const maxAge = cookie.getMaxAge();
            if ( maxAge !== null ){
                header += '; Max-Age=' + maxAge.toString();
            }
            const sameSitePolicy = cookie.getSameSitePolicyName();
            if ( sameSitePolicy !== '' ){
                header += '; SameSite=' + sameSitePolicy;
            }
            cookies.push(header);
        }
        return cookies;
    }

    /**
     * Encrypts the given cookie value according to defined encryption settings.
     *
     * @param {string} value A string representing the cookie value to encrypt.
     *
     * @returns {string} A string containing the encrypted value.
     *
     * @protected
     */
    _encrypt(value){
        //OPTIMIZE: Encryption is a CPU consuming task.

        // Generate the initialization vector for the cipher.
        const vectorLength = HTTPCookieProcessor.SUPPORTED_ENCRYPTION_ALGORITHMS[this._encryptionAlgorithm][0];
        const iv = crypto.randomBytes(vectorLength);
        // Initialize the cipher using the defined settings.
        const cipher = crypto.createCipheriv(this._encryptionAlgorithm, this._encryptionKey, iv);
        // Encrypt the given cookie value and convert the result into a HEX encoded string.
        value = iv.toString('hex') + '.' + cipher.update(value, 'utf8', 'hex');
        value += cipher.final('hex');
        return value;
    }

    /**
     * Decrypts the given cookie value according to defined encryption settings.
     *
     * @param {string} value A string representing the encrypted cookie.
     *
     * @returns {?string} A string containing the decrypted original cookie value or null if given value cannot be decrypted using the key defined.
     *
     * @protected
     */
     _decrypt(value){
        //OPTIMIZE: Decryption is a CPU consuming task.

        // Locate the dot used to separate the IV from the encrypted string.
        const separatorIndex = value.indexOf('.');
        if ( separatorIndex > 0 ){
            // Extract components.
            const iv = Buffer.from(value.substr(0, separatorIndex), 'hex');
            const encryptedValue = value.substr(separatorIndex + 1);
            // Initialize the cipher using the defined settings.
            const decipher = crypto.createDecipheriv(this._encryptionAlgorithm, this._encryptionKey, iv);
            try{
                // Decrypt the given string.
                let decryptedValue = decipher.update(encryptedValue, 'hex', 'utf8');
                value = decryptedValue + decipher.final('utf8');
            }catch(ex){
                // Given value cannot be decrypted using the key defined, probably the given key is not valid.
                if ( ex.code !== 'ERR_OSSL_EVP_BAD_DECRYPT' ){
                    throw ex;
                }
            }
        }
        return value;
    }

    /**
     * The class constructor.
     *
     * @param {?HTTPCookieProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, Cookie>} _clientCookies A map containing the cookie sent by the client stored as key/value pairs.
         *
         * @protected
         */
        this._clientCookies = new Map();

        /**
         * @type {Map<string, Cookie>} _stagedCookies A ma having as key the cookie name and as value an instance of the class "Cookie" representing the cookie to store on the client side.
         *
         * @protected
         */
        this._stagedCookies = new Map();

        /**
         * @type {?string} [_languageCookieName="lala.js::lang"] A string containing the name of the cookie that will contains language declaration for this client request.
         *
         * @protected
         */
        this._languageCookieName = 'lala.js::lang';

        /**
         * @type {boolean} [encryption=false] If set to "true" it means that cookies must be encrypted before being stored on the client side.
         *
         * @protected
         */
        this._encryption = false;

        /**
         * {?Buffer} [encryptionKey] A buffer representing the encryption key, keys must be converted from string to Buffer using the "prepareEncryptionKey" method.
         *
         * @protected
         */
        this._encryptionKey = null;

        /**
         * @type {string} [encryptionAlgorithm="aes-256-cbc"] A string containing the name of the encryption algorithm tu use.
         *
         * @protected
         */
        this._encryptionAlgorithm = 'aes-256-cbc';

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPCookieProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('languageCookieName') && ( configuration.languageCookieName === null || typeof configuration.languageCookieName === 'string' ) ){
            this._languageCookieName = configuration.languageCookieName === '' ? null : configuration.languageCookieName;
        }
        if ( configuration.hasOwnProperty('encryption') && typeof configuration.encryption === 'boolean' ){
            this._encryption = configuration.encryption;
        }
        if ( configuration.hasOwnProperty('encryptionKey') && ( configuration.encryptionKey === null || Buffer.isBuffer(configuration.encryptionKey) ) ){
            this._encryptionKey = configuration.encryptionKey;
        }
        if ( configuration.hasOwnProperty('encryptionAlgorithm') && HTTPCookieProcessor.isSupportedEncryptionAlgorithm(configuration.encryptionAlgorithm) ){
            this._encryptionAlgorithm = configuration.encryptionAlgorithm;
        }
        return this;
    }

    /**
     * Processes and load the cookies sent as part of the client request, this method is chainable.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @throws {InvalidArgumentException} If an invalid request object is given.
     */
    parse(request){
        if ( !( request instanceof http.IncomingMessage ) ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        this._clientCookies = new Map();
        if ( request.headers.hasOwnProperty('cookie') && typeof request.headers.cookie === 'string' && request.headers.cookie !== '' ){
            // Split all the cookies contained in the header found.
            const cookies = request.headers.cookie.split('; ');
            const length = cookies.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( cookies[i] !== '' && cookies[i].indexOf('=') !== -1 ){
                    const cookie = cookies[i].split('=');
                    if ( cookie.length === 2 && cookie[0] !== '' ){
                        if ( this._encryption === true && this._encryptionKey !== null ){
                            // Cookie encryption has been turned on, current cookie should have been encrypted, then decrypt it.
                            cookie[1] = this._decrypt(cookie[1]);
                        }
                        const cookieObject = new Cookie(cookie[0], cookie[1]);
                        this._clientCookies.set(cookie[0], cookieObject);
                    }
                }
            }
        }
        return this;
    }

    /**
     * Returns all the cookies that have been sent by the client.
     *
     * @return {Map<string, Cookie>} A map containing all the cookies found, having as key the unique cookie name and as value its value both as strings.
     */
    getClientCookies(){
        return this._clientCookies;
    }

    /**
     * Returns all the cookies that have been added or marked to be removed.
     *
     * @return {Map<string, Cookie>} A map having as key the unique cookie name and as value an instance of the class "Cookie" representing the cookie and its properties.
     */
    getStagedCookies(){
        return this._stagedCookies;
    }

    /**
     * Adds a cookie to the queue of all the cookie that will sent to the client to be stored, this method is chainable.
     *
     * @param {string} name A string containing the cookie unique name.
     * @param {string} value A string containing some data to store in the cookie.
     * @param {?CookieOptions} [options] An object containing some additional attributes this cookie should take care of.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     * @throws {InvalidArgumentException} If a non-string value is given as cookie value.
     */
    setCookie(name, value, options = null){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        if ( typeof value !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie value.', 2);
        }
        // Generate the object representing this cookie.
        const cookie = Cookie.buildFromOptions(name, value, options);
        // Add the generated cookie object to the queue.
        this.setCookieObject(cookie);
        return this;
    }

    /**
     * Adds a given cookie to the list of all the cookies staged to be sent to the client, this method is chainable.
     *
     * @param {Cookie} cookie An instance of the class "Cookie" representing the cookie to stage.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie object is given.
     */
    setCookieObject(cookie){
        if ( !( cookie instanceof Cookie ) ){
            throw new InvalidArgumentException('Invalid cookie object.', 1);
        }
        const name = cookie.getName();
        this._stagedCookies.set(name, cookie);
        return this;
    }

    /**
     * Removes a given cookie, this method is chainable.
     *
     * @param {string} name A string containing the cookie unique name.
     * @param {?CookieOptions} [options] An object containing some additional attributes this cookie should take care of, note that expiration day is ignored here.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    removeCookie(name, options = null){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        const cookie = Cookie.buildFromOptions(name, '', options);
        cookie.setMaxAge(0);
        this._stagedCookies.set(name, cookie);
        return this;
    }

    /**
     * Removes a given cookie from the list of all the cookies to set on the client side, this method is chainable.
     *
     * @param {string} name A string containing the cookie unique name.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    unstageCookie(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        this._stagedCookies.delete(name);
        return this;
    }

    /**
     * Returns a cookie matching the given name.
     *
     * @param {string} name A string containing the name of the cookie to return.
     * @param {?number} [status] An integer number representing the status of the cookie that can be returned, 1 for client provided, 2 for staged, null (default one) for both.
     *
     * @returns {?Cookie} An instance of the class "Cookie" representing the cookie found or null if no cookie matching this name is found.
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    getCookie(name, status = null){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        let cookie = status === null || status === 2 ? this._stagedCookies.get(name) : undefined;
        if ( typeof cookie === 'undefined' ){
            cookie = status === null || status === 1 ? this._clientCookies.get(name) : undefined;
        }
        return typeof cookie === 'undefined' ? null : cookie;
    }

    /**
     * Returns the value of a cookie matching the given name.
     *
     * @param {string} name A string containing the name of the cookie to return.
     *
     * @returns {?string} A string containing the cookie value or null if no cookie matching this name has been found.
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    getCookieValue(name){
        const cookie = this.getCookie(name);
        return cookie === null ? null : cookie.getValue();
    }

    /**
     * Adds to the given server response object the header that contains all the staged cookies to save on the client side, this method is chainable.
     *
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid response object is given.
     * @throws {BadMethodCallException} If this method is invoked after HTTP headers have been sent to client.
     */
    writeHeader(response){
        if ( !( response instanceof http.ServerResponse ) ){
            throw new InvalidArgumentException('Invalid response object.', 1);
        }
        if ( response.headersSent ){
            throw new BadMethodCallException('Cannot set cookie header as HTTP headers have already been sent to client.', 2);
        }
        const header = this._generateHeader();
        if ( header.length !== 0 ){
            response.setHeader('Set-Cookie', header);
        }
        return this;
    }

    /**
     * Parses and adds cookies found to the given request object by setting the "cookies" property, this method is chainable.
     *
     * {http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @return {HTTPCookieProcessor}
     */
    appendCookies(request){
        this.parse(request);
        request.cookies = this.getClientCookies();
        return this;
    }

    /**
     * Checks if a language has been defined through cookies and, if found, sets it as the declared language for current request, this method is chainable.
     *
     * @param {http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {HTTPCookieProcessor}
     */
    processLanguage(request){
        if ( this._languageCookieName !== null ){
            // Get the language code according to the name of the cookie that should store this setting that has been defined.
            const language = this.getCookieValue(this._languageCookieName);
            if ( language !== null && language !== '' ){
                // If found, set it as the declared language.
                request.declaredLanguage = language;
                request.languageDeclarationType = 4;
            }
        }
        return this;
    }

    /**
     * Processes cookies sent by the client and append cookie helper functions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async process(request, response){
        // Parse cookies sent over the HTTP request.
        this.appendCookies(request);
        this.processLanguage(request);
        // Injects some helper functions useful when dealing with cookies.
        HelperRepository.inject(request, 'com.lala.server.processor.HTTPCookieProcessor.request', {
            processor: this
        });
        HelperRepository.inject(response, 'com.lala.server.processor.HTTPCookieProcessor.response', {
            processor: this
        });
        // Export this class instance in the request object.
        request.cookieProcessor = this;
    }
}

/**
 * @constant Defines all the supported encryption algorithms.
 *
 * @type {Object.<string, number[]>}
 * @default
 */
Object.defineProperty(HTTPCookieProcessor, 'SUPPORTED_ENCRYPTION_ALGORITHMS', {
    value: {
        ['aes-128-cbc']: [16, 16],
        ['aes-192-cbc']: [16, 24],
        ['aes-256-cbc']: [16, 32]
    },
    writable: false,
    enumerable: true,
    configurable: true
});

module.exports = HTTPCookieProcessor;
