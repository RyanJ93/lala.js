'use strict';

// Including native modules.
const filesystem = require('fs');
const queryString = require('querystring');

// Including Lala's modules.
const RequestProcessor = require('../RequestProcessor');
const StreamedFileResponse = require('../../responses/StreamedFileResponse');
const FileResponse = require('../../responses/FileResponse');
const RedirectResponse = require('../../responses/RedirectResponse');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @typedef HTTPRequestProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {number} [maxURLLength=8192] An integer number representing the maximum allowed size for request URLs in characters.
 */

/**
 * Allows to handle client requests processing data and parameters sent over the HTTP protocol.
 */
class HTTPRequestProcessor extends RequestProcessor {
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
        request.query = queryIndex === -1 ? {} : queryString.parse(request.url.substr(queryIndex + 1));
    }

    /**
     * Adds user credentials found by processing the request URL and the HTTP headers.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _addCredentials(request){
        request.credentials = null;
        request.authMethod = null;
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
                if ( block.length === 1 ){
                    // No score found, current language is the default one, set score to 1 (the maximum value allowed).
                    request.languages.set(block[0], 1);
                    if ( request.preferredLanguage === null ){
                        request.preferredLanguage = block[0];
                        request.preferredLanguageScore = 1;
                    }
                    continue;
                }
                if ( block[1].indexOf('q=') === 0 ){
                    // Process priority value defined for current language.
                    const priority = parseFloat(block[1].substr(2));
                    if ( !isNaN(priority) && priority <= 1 ){
                        request.languages.set(block[0], priority);
                        if ( request.preferredLanguage === null ){
                            request.preferredLanguage = block[0];
                            request.preferredLanguageScore = priority;
                        }
                    }
                }
            }
        }
    }

    /**
     * Adds some useful helper function to the response object given.
     *
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @protected
     */
    _addResponseHelpers(response){
        response.download = (path, filename = null) => {
            return new FileResponse(path, filename, true);
        };
        response.stream = (path, filename = null) => {
            return new StreamedFileResponse(path, filename, true);
        };
        response.redirect = (url, permanent = false) => {
            return new RedirectResponse(url, permanent);
        };
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
        return baseConfiguration;
    }

    /**
     * The class constructor.
     *
     * @param {?HTTPRequestProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

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
        request.rawBody = request.params = undefined;
        this._addQueryParameters(request);
        this._addCredentials(request);
        this._addAcceptedLanguages(request);
        this._addResponseHelpers(response);
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
            // Removes all the uploaded files stored in the temporary directory defined.
            let processes = [];
            for ( const name in request.files ){
                if ( request.files.hasOwnProperty(name) && request.files[name].tmpPath !== '' && typeof request.files[name].tmpPath === 'string' ){
                    processes.push(filesystem.promises.unlink(request.files[name].tmpPath));
                }
            }
            await Promise.all(processes);
        }
    }
}

module.exports = HTTPRequestProcessor;
