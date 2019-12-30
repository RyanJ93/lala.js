'use strict';

// Including native modules.
const http = require('http');

// Including Lala's modules.
const Processor = require('./Processor');
const {
    InvalidArgumentException,
    URITooLongHTTPException
} = require('../../Exceptions');
const { generateUUID } = require('../../Helpers/helpers/BuiltInHelpers');

/**
 * @typedef {Object} RequestProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {number} [maxURLLength=8192] An integer number representing the maximum allowed size for request URLs in characters.
 * @property {?RegExp} [URLMapping] A regex used to extract parameters from the whole request URL, for instance, the language associated to a domain name or path.
 * @property {Map<string, LanguageDeclaration>} languageDeclarations A map containing all the language declarations to use when detecting what language should be used for a client request.
 */

/**
 * Processes client request handling client provided input data.
 */
class RequestProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {RequestProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            maxURLLength: 8192,
            URLMapping: null,
            languageDeclarations: new Map()
        };
    }

    /**
     * Adds some additional properties to the request URL.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addRequestProperties(request){
        request.id = generateUUID(4, false);
        request.processedByLala = true;
        request.completeHost = request.headers.hasOwnProperty('host') ? request.headers.host : '';
        request.host = request.completeHost.split(':')[0];
        request.fullURL = request.completeHost + request.url;
        request.originalURL = request.url;
        request.originalFullURL = request.completeHost + request.originalURL;
        request.skipRouteProcessing = false;
        const index = request.url.indexOf('?');
        request.path = index > 0 ? request.url.substr(0, index) : request.url;
    }

    /**
     * Applies the defined regex to the request URL in order to extract some properties.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _applyURLMapping(request){
        request.mapping = {};
        if ( this._URLMapping !== null ){
            // Executes the regex defined.
            const matches = this._URLMapping.exec(request.fullURL);
            if ( matches !== null && matches.hasOwnProperty('groups') ){
                // Set a valid prototype instead of the "null" prototype.
                request.mapping = Object.setPrototypeOf(matches.groups, Object.prototype);
            }
        }
    }

    /**
     * Detects the language from the request URL according to the language declarations that have been defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _applyLanguageDeclarations(request){
        request.declaredLanguage = request.languageDeclarationType = null;
        let declaration = this._languageDeclarations.get(request.host);
        if ( typeof declaration !== 'undefined' ){
            request.declaredLanguage = declaration.language;
            request.languageDeclarationType = declaration.type;
        }else{
            const index = request.originalURL.indexOf('/', 1);
            const prefix = index <= 0 ? '' : request.originalURL.substr(0, index);
            declaration = this._languageDeclarations.get(prefix);
            if ( typeof declaration !== 'undefined' ){
                request.url = request.originalURL.substr(prefix.length);
                request.declaredLanguage = declaration.language;
                request.languageDeclarationType = declaration.type;
            }
        }
    }

    /**
     * The class constructor.
     *
     * @param {?RequestProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {number} [_maxURLLength=8192] An integer number representing the maximum allowed size for request URLs in characters.
         *
         * @protected
         */
        this._maxURLLength = 8192;

        /**
         * @type {?RegExp} [_URLMapping] A regex used to extract parameters from the whole request URL, for instance, the language associated to a domain name or path.
         *
         * @protected
         */
        this._URLMapping = null;

        /**
         * @type {Map<string, LanguageDeclaration>} _languageDeclarations A map containing all the language declarations to use when detecting what language should be used for a client request.
         *
         * @protected
         */
        this._languageDeclarations = new Map();

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {RequestProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {RequestProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('maxURLLength') && !isNaN(configuration.maxURLLength) && configuration.maxURLLength > 0 ){
            this._maxURLLength = configuration.maxURLLength;
        }
        if ( configuration.hasOwnProperty('URLMapping') && ( configuration.URLMapping === null || configuration.URLMapping instanceof RegExp ) ){
            this._URLMapping = configuration.URLMapping;
        }
        if ( configuration.hasOwnProperty('languageDeclarations') && configuration.languageDeclarations instanceof Map ){
            this._languageDeclarations = configuration.languageDeclarations;
        }
        return this;
    }

    /**
     * Processes client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async process(request, response){
        if ( Buffer.byteLength(request.url) > this._maxURLLength ){
            throw new URITooLongHTTPException('Client provided URL exceeded the allowed size.', 1);
        }
        // Cleaning up the request path removing components such as "../" and "./".
        request.url = request.url.replace(/\/?\.\.\/|\/\.\.\/?|\/?\.\/|\/\.\/?/g, '/');
        // Removing multiple slashes from the request URL.
        if ( request.url.indexOf('//') !== -1 ){
            request.url = request.url.replace(/\/{2,}/g, '/');
        }
        // Add some additional properties.
        this._addRequestProperties(request);
        // Applies the URL mapping regex defined to current client request.
        this._applyURLMapping(request);
        // Detect the language according to defined language declarations.
        this._applyLanguageDeclarations(request);
    }
}

module.exports = RequestProcessor;
