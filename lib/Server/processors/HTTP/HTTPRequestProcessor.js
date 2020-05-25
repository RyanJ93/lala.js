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
     * Extract the eTags contained in a given header.
     *
     * @param {string} headerValue A string representing the header contents.
     *
     * @returns {string[]} An array of strings containing the eTags found.
     *
     * @protected
     */
    static _extractETags(headerValue){
        const extractedETags = [];
        // Extract the eTags from the given header contents.
        const eTags = headerValue.split(','), length = eTags.length;
        // Clean up every eTag.
        for ( let i = 0 ; i < length ; i++ ){
            // Remove trailing spaces.
            eTags[i] = eTags[i].trim();
            if ( eTags[i][0] === 'W' && eTags[i][1] === '/' ){
                // Remove the "W/" prefix (indicating that this is a "weak" eTag).
                eTags[i] = eTags[i].substr(2);
            }
            // Remove quotes.
            eTags[i] = eTags[i].substr(1, eTags[i].length - 2);
            extractedETags.push(eTags[i]);
        }
        return extractedETags;
    }

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
        request.query = request._queryStartIndex === -1 ? Object.create(null) : queryString.parse(request.url.substr(request._queryStartIndex + 1));
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
        request.languages = Object.create(null);
        request.preferredLanguage = request.preferredLanguageScore = null;
        if ( request.headers['accept-language'] !== '' && typeof request.headers['accept-language'] === 'string' ){
            const blocks = request.headers['accept-language'].split(','), length = blocks.length;
            for ( let i = 0 ; i < length ; i++ ){
                // Split the language code and its score.
                const block = blocks[i].split(';');
                const languageCode = block[0].trim();
                if ( block.length === 1 ){
                    // No score found, current language is the default one, set score to 1 (the maximum value allowed).
                    request.languages[languageCode] = 1;
                    if ( request.preferredLanguage === null ){
                        request.preferredLanguage = languageCode;
                        request.preferredLanguageScore = 1;
                    }
                }else if ( block[1].indexOf('q=') === 0 ){
                    // Process priority value defined for current language.
                    const priority = parseFloat(block[1].substr(2));
                    if ( !isNaN(priority) && priority <= 1 ){
                        request.languages[languageCode] = priority;
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
        if ( request._queryStartIndex === -1 ){
            request.segments = request.url.substr(1).split('/');
        }else{
            request.segments = request.url.substr(0, request._queryStartIndex).split('/');
        }
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
            }else if ( request.headers['x-http-method-override'] !== '' && typeof request.headers['x-http-method-override'] === 'string' ){
                // New method name found from the "X-Http-Method-Override" HTTP header.
                request.method = request.headers['x-http-method-override'].toUpperCase();
                request.methodOverridden = true;
            }
        }
    }

    /**
     * Parses the content of the "Range" header involved in HTTP range request (used, for instance, in video streaming).
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addRange(request){
        request.ranges = [];
        if ( request.headers.range !== '' && typeof request.headers.range === 'string' && request.headers.range.indexOf('bytes=') === 0 ){
            // Extract the header content without the "bytes=" indicating the measurement unit, note that "bytes" is the only supported unit.
            const ranges = request.headers.range.substr(6).split(','), length = ranges.length;
            // Process each requested range.
            for ( let i = 0 ; i < length ; i++ ){
                // Clean up the range syntax.
                ranges[i] = ranges[i].trim();
                const index = ranges[i].indexOf('-');
                if ( index >= 0 ){
                    let rangeStart = null, rangeEnd = null, suffixLength = null;
                    if ( index === 0 ){
                        // This value indicated the number of bytes at the end of the file to return.
                        suffixLength = parseInt(ranges[i].substr(1));
                    }else{
                        // Extract the number of bytes the returned slice should start from.
                        rangeStart = parseInt(ranges[i].substr(0, index));
                        // If the "-" is not at the end of the string extract the end index as well.
                        rangeEnd = index === ( ranges[i].length - 1 ) ? null : parseInt(ranges[i].substr(index + 1));
                    }
                    request.ranges.push({
                        rangeStart: rangeStart,
                        rangeEnd: rangeEnd,
                        suffixLength: suffixLength
                    });
                }
            }
        }
    }

    /**
     * Extracts all the pieces of information from the conditional HTTP headers and the add the conditionals parameters to the request object.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addConditionals(request){
        request.conditionals = {
            matchAnyETag: false,
            matchETags: [],
            modifiedSince: null,
            mismatchAnyETag: false,
            mismatchETags: [],
            unmodifiedSince: null,
            vary: [],
            varyAny: false
        };
        if ( request.headers['if-match'] !== '' && typeof request.headers['if-match'] === 'string' ){
            if ( request.headers['if-match'] === '*' ){
                request.conditionals.matchAnyETag = true;
            }else{
                // Extract the list of eTags.
                request.conditionals.matchETags = HTTPRequestProcessor._extractETags(request.headers['if-match']);
            }
        }
        if ( request.headers['if-modified-since'] !== '' && typeof request.headers['if-modified-since'] === 'string' ){
            const timestamp = Date.parse(request.headers['if-modified-since']);
            if ( !isNaN(timestamp) ){
                request.conditionals.modifiedSince = new Date(timestamp);
            }
        }
        if ( request.headers['if-none-match'] !== '' && typeof request.headers['if-none-match'] === 'string' ){
            if ( request.headers['if-none-match'] === '*' ){
                request.conditionals.mismatchAnyETag = true;
            }else{
                // Extract the list of eTags.
                request.conditionals.mismatchETags = HTTPRequestProcessor._extractETags(request.headers['if-none-match']);
            }
        }
        if ( request.headers['if-unmodified-since'] !== '' && typeof request.headers['if-unmodified-since'] === 'string' ){
            const timestamp = Date.parse(request.headers['if-unmodified-since']);
            if ( !isNaN(timestamp) ){
                request.conditionals.unmodifiedSince = new Date(timestamp);
            }
        }
        if ( request.headers['vary'] !== '' && typeof request.headers['vary'] === 'string' ){
            if ( request.headers['vary'] === '*' ){
                request.conditionals.varyAny = true;
            }else{
                // Extract the list of HTTP headers.
                const headers = request.headers['vary'].split(','), length = headers.length;
                // Clean up and normalize each header of the list.
                for ( let i = 0 ; i < length ; i++ ){
                    request.conditionals.vary.push(headers[i].trim().toLowerCase());
                }
            }
        }
    }

    /**
     * Extracts the MIME types accepted and then declared by the client side as part of the "Accept" HTTP header.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addAccept(request){
        request.accept = Object.create(null);
        if ( request.headers.accept !== '' && typeof request.headers.accept === 'string' ){
            // Split the MIME type list into an array of strings.
            const mimes = request.headers.accept.split(','), length = mimes.length;
            for ( let i = 0 ; i < length ; i++ ){
                // Clean up current MIME type.
                mimes[i] = mimes[i].trim();
                // Extract the preference score associated to the MIME type.
                const index = mimes[i].indexOf(';');
                let mime, score;
                if ( index === -1 ){
                    // No score associated, use 1.
                    mime = mimes[i];
                    score = 1;
                }else{
                    // Extract and cast the score associated, if not valid, use 1 instead.
                    mime = mimes[i].substr(0, index);
                    score = parseFloat(mimes[i].substr(index));
                    if ( isNaN(score) ){
                        score = 1;
                    }
                }
                if ( mime !== '' ){
                    request.accept[mime] = score;
                }
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
        request.user = request.authenticator = request.userSession = request.cookies = request.preflightRequestMethod = null;
        // Marks those properties that will be used in request body processing.
        request.rawBody = undefined;
        request.params = Object.create(null);
        request.secure = request.connection.hasOwnProperty('encrypted');
        request.ignoreConditionalsHeaders = request.isPreflightRequest = false;
        if ( request.method === 'OPTIONS' && typeof request.headers.origin === 'string' && request.headers.origin !== '' ){
            if ( request.headers['access-control-request-method'] !== '' && typeof request.headers['access-control-request-method'] === 'string' ){
                request.isPreflightRequest = true;
                request.preflightRequestMethod = request.headers['access-control-request-method'];
            }
        }
        request.doNotTrack = request.headers['dnt'] === '1';
        this._addQueryParameters(request);
        // Apply method override (if enabled).
        this._processMethodOverride(request);
        this._addCredentials(request);
        this._addAcceptedLanguages(request);
        this._addURLSegments(request);
        this._addRange(request);
        this._addConditionals(request);
        this._addAccept(request);
        // Add helper functions.
        HelperRepository.inject(request, 'com.lala.server.processor.HTTPRequestProcessor.request', {
            context: {
                request: request,
                response: response
            }
        });
        HelperRepository.inject(response, 'com.lala.server.processor.HTTPRequestProcessor.response', {
            context: {
                request: request,
                response: response
            }
        });
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
