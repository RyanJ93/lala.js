'use strict';

// Including native modules.
const filesystem = require('fs');
const queryString = require('querystring');

// Including Lala's modules.
const InputProcessor = require('../InputProcessor');
const HTTPMultiPartFormDataParser = require('../../support/HTTPMultiPartFormDataParser');
const {
    InvalidArgumentException,
    BadRequestHTTPException
} = require('../../../Exceptions');

/**
 * @typedef {Object} HTTPInputProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {number} [maxInputLength=2097152] An integer number greater than zero representing the max allowed size (in bytes) for request data, by default, 2 mb.
 * @property {string} [temporaryUploadedFileDirectory="drive/tmp/uploads/"] A string containing the path to the directory where uploaded files will be saved during client request processing.
 * @property {?number} [maxUploadedFileSize=10485760] An integer number greater than zero representing the maximum size allowed for each file (in bytes).
 * @property {?number} [maxAllowedFileNumber] An integer number greater or equal than zero representing the maximum number of files that a request can contain.
 * @property {Set<string>} deniedFileExtensions A set containing all the file extensions that are not allowed to be uploaded.
 * @property {boolean} [allowFileUploads=true] If set to "false" uploaded files found will be ignored.
 */

/**
 * Handles and processes incoming data from network requests according to the HTTP protocol.
 */
class HTTPInputProcessor extends InputProcessor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPInputProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        const baseConfiguration = InputProcessor.getDefaultConfiguration();
        const configuration = Object.create(baseConfiguration);
        return Object.assign(configuration, {
            temporaryUploadedFileDirectory: 'drive/tmp/uploads/',
            maxUploadedFileSize: 10485760,
            maxAllowedFileNumber: null,
            deniedFileExtensions: new Set(),
            allowFileUploads: true
        });
    }

    /**
     * Ensures that the directory where uploaded files are going to be stored exists.
     *
     * @protected
     */
    _ensureTemporaryUploadedFileDirectory(){
        if ( !filesystem.existsSync(this._temporaryUploadedFileDirectory) ){
            // If current directory doesn't exist, create it including its hierarchy.
            filesystem.mkdirSync(this._temporaryUploadedFileDirectory, {
                recursive: true
            });
        }
    }

    /**
     * Processes request data sent and appends to the parameters stack all the POST parameters and files sent.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    _processMultipartRequestData(request){
        return new Promise((resolve, reject) => {
            const parser = new HTTPMultiPartFormDataParser();
            parser.setDeniedFileExtensions(this._deniedFileExtensions);
            parser.setMaxAllowedFileNumber(this._maxAllowedFileNumber);
            parser.setMaxUploadedFileSize(this._maxUploadedFileSize);
            parser.setTemporaryUploadedFileDirectory(this._temporaryUploadedFileDirectory);
            parser.setAllowFileUploads(this._allowFileUploads);
            parser.prepare(request, true);
            request.on('data', (data) => {
                try{
                    // Process current data chunk.
                    parser.parse(data);
                }catch(ex){
                    reject(ex);
                }
            });
            request.on('end', () => {
                // Conclude the HTTP body parsing.
                parser.end().then(() => {
                    request.params = parser.getParameters();
                    request.files = parser.getFiles();
                    resolve();
                }).catch((ex) => reject(ex));
            });
            request.on('error', (error) => {
                // An error occurred while loading request body, for instance, connection has fallen.
                reject(new BadRequestHTTPException('An error occurred while loading request body.', 2, error));
            });
        });
    }

    /**
     * Applies method override, if enabled, setting current request according to client provided overriding parameter.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.c
     *
     * @protected
     */
    _processMethodOverride(request){
        if ( request.methodOverridden === false && request.methodOverrideParamName !== null ){
            // Method override is enabled and HTTP method has not been overridden yet.
            if ( request.params[request.methodOverrideParamName] !== '' && typeof request.params[request.methodOverrideParamName] === 'string' ){
                // New method name found in a POST parameter.
                request.method = request.params[request.methodOverrideParamName].toUpperCase();
                request.methodOverridden = true;
            }
        }
    }

    /**
     * The class constructor.
     *
     * @param {?HTTPInputProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {string} [_temporaryUploadedFileDirectory="drive/tmp/uploads/"] A string containing the path to the directory where uploaded files will be saved during client request processing.
         *
         * @protected
         */
        this._temporaryUploadedFileDirectory = 'drive/tmp/uploads/';

        /**
         * @type {?number} [_maxUploadedFileSize=10485760] An integer number greater than zero representing the maximum size allowed for each file (in bytes).
         *
         * @protected
         */
        this._maxUploadedFileSize = 10485760;

        /**
         * @type {?number} _maxAllowedFileNumber An integer number greater or equal than zero representing the maximum number of files that a request can contain.
         *
         * @protected
         */
        this._maxAllowedFileNumber = null;

        /**
         * @type {Set<string>} _deniedFileExtensions A set containing all the file extensions that are not allowed to be uploaded.
         *
         * @protected
         */
        this._deniedFileExtensions = new Set();

        /**
         * @type {boolean} [_allowFileUploads=true] If set to "false" uploaded files found will be ignored.
         *
         * @protected
         */
        this._allowFileUploads = true;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPInputProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPInputProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        super.configure(configuration);
        if ( configuration.hasOwnProperty('temporaryUploadedFileDirectory') && configuration.temporaryUploadedFileDirectory !== '' && typeof configuration.temporaryUploadedFileDirectory === 'string' ){
            this._temporaryUploadedFileDirectory = configuration.temporaryUploadedFileDirectory;
        }
        if ( configuration.hasOwnProperty('maxUploadedFileSize') && ( configuration.maxUploadedFileSize === null || ( !isNaN(configuration.maxUploadedFileSize) && configuration.maxUploadedFileSize > 0 ) ) ){
            this._maxUploadedFileSize = configuration.maxUploadedFileSize;
        }
        if ( configuration.hasOwnProperty('maxAllowedFileNumber') && ( configuration.maxAllowedFileNumber === null || ( !isNaN(configuration.maxAllowedFileNumber) && configuration.maxAllowedFileNumber > 0 ) ) ){
            this._maxAllowedFileNumber = configuration.maxAllowedFileNumber;
        }
        if ( configuration.hasOwnProperty('deniedFileExtensions') && configuration.deniedFileExtensions instanceof Set ){
            this._deniedFileExtensions = configuration.deniedFileExtensions;
        }
        if ( configuration.hasOwnProperty('allowFileUploads') && typeof configuration.allowFileUploads === 'boolean' ){
            this._allowFileUploads = configuration.allowFileUploads;
        }
        // Ensure the directory where temporary uploaded files will be stored to exist.
        this._ensureTemporaryUploadedFileDirectory();
        return this;
    }

    /**
     * Processes given request in order to append HTTP POST parameters to it.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @override
     */
    async process(request, response){
        if ( request.method === 'POST' || request.method === 'PATCH' ){
            const contentType = request.headers.hasOwnProperty('content-type') ? request.headers['content-type'] : 'application/x-www-form-urlencoded';
            if ( contentType.indexOf('multipart/form-data') === 0 ){
                // Request data may contains both plain parameters and files, let's process them.
                await this._processMultipartRequestData(request);
            }else{
                // Load request data as a plain text by using parent defined method.
                await super.process(request, response);
                if ( contentType !== 'text/plain' ){
                    // Parse the request body.
                    request.params = queryString.parse(request.rawBody);
                }
            }
            // Apply method override (if enabled).
            this._processMethodOverride(request);
        }
    }
}

module.exports = HTTPInputProcessor;
