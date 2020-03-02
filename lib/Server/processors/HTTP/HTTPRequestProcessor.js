'use strict';

// Including native modules.
const filesystem = require('fs');
const queryString = require('querystring');

// Including Lala's modules.
const RequestProcessor = require('../RequestProcessor');
const UploadedFile = require('../../../Types/UploadedFile');
const HelperRepository = require('../../../Helpers/HelperRepository');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @typedef {RequestProcessorConfiguration} HTTPRequestProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {boolean} [allowMethodOverride=false] If set to "true" request method can be defined setting a proper parameter as part of the request.
 * @property {string} [methodOverrideParamName="_method"] The name of the GET/POST parameter that contains the name of the method that will be used in method override (if enabled).
 */

/**
 * Allows to handle client requests processing data and parameters sent over the HTTP protocol.
 */
class HTTPRequestProcessor extends RequestProcessor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPRequestProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        const baseConfiguration = RequestProcessor.getDefaultConfiguration();
        baseConfiguration.allowMethodOverride = false;
        baseConfiguration.methodOverrideParamName = '_method';
        return baseConfiguration;
    }

    /**
     * Adds the GET parameters extracted and parsed from the query string.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addQueryParameters(request){
        // Processing GET parameters.
        const queryIndex = request.url.indexOf('?');
        request.query = queryIndex === -1 ? Object.create(null) : queryString.parse(request.url.substr(queryIndex + 1));
    }

    /**
     * Adds user credentials found by processing the request URL and the HTTP headers.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addCredentials(request){
        request.credentials = request.authMethod = null;
        try{
            const url = new URL(request.url);
            if ( url.password !== '' || url.username !== '' ){
                // Processing user credentials provided directly in request URL.
                request.credentials = {
                    password: url.password === '' ? null : url.password,
                    username: url.username === '' ? null : url.username
                };
            }
        }catch{}
        if ( request.headers.authorization !== '' && typeof request.headers.authorization === 'string' ){
            // Separate credentials from the authentication method.
            const components = request.headers.authorization.split(' ', 2);
            if ( components.length === 2 ){
                request.authMethod = components[0].toLowerCase();
                if ( request.authMethod === 'basic' ){
                    // Decode user credentials used in basic HTTP authentication mechanism.
                    const credentials = Buffer.from(components[1], 'base64').toString().split(':');
                    if ( credentials.length === 2 ){
                        request.credentials = {
                            username: credentials[0],
                            password: credentials[1]
                        };
                    }
                }
            }
        }
    }

    /**
     * Adds the client provided language codes to the request object given.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addAcceptedLanguages(request){
        request.languages = new Map();
        request.preferredLanguage = request.preferredLanguageScore = null;
        if ( request.headers.hasOwnProperty('accept-language') && typeof request.headers['accept-language'] === 'string' && request.headers['accept-language'] !== '' ){
            const blocks = request.headers['accept-language'].split(',');
            const length = blocks.length;
            for ( let i = 0 ; i < length ; i++ ){
                // Split the language code and its score.
                const block = blocks[i].split(';');
                const languageCode = block[0].trim();
                if ( block.length === 1 ){
                    // No score found, current language is the default one, set score to 1 (the maximum value allowed).
                    request.languages.set(languageCode, 1);
                    if ( request.preferredLanguage === null ){
                        request.preferredLanguage = languageCode;
                        request.preferredLanguageScore = 1;
                    }
                }else if ( block[1].indexOf('q=') === 0 ){
                    // Process priority value defined for current language.
                    const priority = parseFloat(block[1].substr(2));
                    if ( !isNaN(priority) && priority <= 1 ){
                        request.languages.set(languageCode, priority);
                        if ( request.preferredLanguage === null ){
                            request.preferredLanguage = languageCode;
                            request.preferredLanguageScore = priority;
                        }
                    }
                }
            }
        }
    }

    /**
     * Extract segments from request URL's path and then add them to the request object given.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addURLSegments(request){
        const url = request.url.substr(1);
        const index = url.indexOf('?');
        request.segments = index === -1 ? url.split('/') : url.substr(0, index).split('/');
    }

    /**
     * Applies method override, if enabled, setting current request according to client provided overriding parameter or header.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _processMethodOverride(request){
        request.originalMethod = request.method;
        request.methodOverrideParamName = null;
        request.methodOverridden = false;
        if ( this._allowMethodOverride === true ){
            // Method override enabled, save the name of the parameter that should contains the method name making it available across processors.
            request.methodOverrideParamName = this._methodOverrideParamName;
            if ( request.query[this._methodOverrideParamName] !== '' && typeof request.query[this._methodOverrideParamName] === 'string' ){
                // New method name found in a GET parameter.
                request.method = request.query[this._methodOverrideParamName].toUpperCase();
                request.methodOverridden = true;
            }else if ( request.headers.hasOwnProperty('x-http-method-override') && request.headers['x-http-method-override'] !== '' ){
                // New method name found from the "X-Http-Method-Override" HTTP header.
                request.method = request.headers['x-http-method-override'].toUpperCase();
                request.methodOverridden = true;
            }
        }
    }

    /**
     * The class constructor.
     *
     * @param {?HTTPRequestProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {boolean} [_allowMethodOverride=false] If set to "true" request method can be defined setting a proper parameter as part of the request.
         *
         * @protected
         */
        this._allowMethodOverride = false;

        /**
         * @type {string} [_methodOverrideParamName="_method"] The name of the GET/POST parameter that contains the name of the method that will be used in method override (if enabled).
         *
         * @protected
         */
        this._methodOverrideParamName = '_method';

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPRequestProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPRequestProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        super.configure(configuration);
        if ( configuration.hasOwnProperty('allowMethodOverride') && typeof configuration.allowMethodOverride === 'boolean' ){
            this._allowMethodOverride = configuration.allowMethodOverride;
        }
        if ( configuration.hasOwnProperty('methodOverrideParamName') && configuration.methodOverrideParamName !== '' && typeof configuration.methodOverrideParamName === 'string' ){
            this._methodOverrideParamName = configuration.methodOverrideParamName;
        }
        return this;
    }

    /**
     * Adds basic properties to a given HTTP request object, for instance GET parameters, user credentials and user languages.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async process(request, response){
        await super.process(request, response);
        request.user = request.authenticator = request.userSession = request.cookies = null;
        // Marks those properties that will be used in request body processing.
        request.rawBody = undefined;
        response.rawOutput = null;
        request.params = Object.create(null);
        request.secure = request.connection.hasOwnProperty('encrypted');
        this._addQueryParameters(request);
        // Apply method override (if enabled).
        this._processMethodOverride(request);
        this._addCredentials(request);
        this._addAcceptedLanguages(request);
        this._addURLSegments(request);
        // Add helper functions.
        HelperRepository.inject(response, 'com.lala.server.processor.HTTPRequestProcessor.response');
    }

    /**
     * Destroys all temporary data that is not more required to exist.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @return {Promise<void>}
     *
     * @protected
     */
     async killRequest(request){
        if ( request.hasOwnProperty('files') && request.files !== null && typeof request.files === 'object' ){
            setImmediate(async () => {
                const processes = [];
                // Remove all the uploaded files from their temporary location.
                for ( const name in request.files ){
                    if ( request.files[name] instanceof UploadedFile && !request.files[name].moved() ){
                        // Remove the file only if it has not been moved to a permanent location.
                        processes.push(filesystem.promises.unlink(request.files[name].getPath()));
                    }
                }
                await Promise.all(processes);
            });
        }
    }
}

module.exports = HTTPRequestProcessor;
