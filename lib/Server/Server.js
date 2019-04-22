'use strict';

// Including native modules.
const { EventEmitter } = require('events');
const zlib = require('zlib');
const { Readable } = require('stream');

// Including Lala's modules.
const Router = require('../Routing/Router');
const View = require('../View/View');
const Request = require('./Request');
const ServerProviderRepository = require('./ServerProviderRepository');
const ServerRepository = require('./ServerRepository');
const Config = require('../Config/Config');
const Logger = require('../Logger/Logger');
const { generateUUID } = require('../helpers');
const {
    BasicHTTPAuthenticator
} = require('../Authenticator');
const {
    RuntimeException,
    InvalidArgumentException,
    NotCallableException
} = require('../Exceptions');

/**
 * This class allows to create a server by providing basic features such as access middleware support.
 *
 * @abstract
 */
/* abstract */ class Server extends EventEmitter {
    /**
     * Initializes the servers according with the settings defined in the configuration file.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async initFromConfig(){
        const servers = Config.getProperty('servers');
        if ( !Array.isArray(servers) || servers.length === 0 ){
            return;
        }
        const length = servers.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( servers[i].name === '' || typeof servers[i].name !== 'string' || servers[i].server === '' || typeof servers[i].server !== 'string' ){
                continue;
            }
            const serverClass = ServerProviderRepository.get(servers[i].server);
            let server = serverClass.createFromConfigBlock(servers[i]);
            ServerRepository.register(servers[i].name, server);
        }
    }

    /**
     * Runs all the defined middlewares functions in order to determine if current request can be processed or closed.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @private
     */
    async _runAccessMiddlewares(request, response){
        // Get all the middlewares as an array of functions.
        const functions = Array.from(this._accessMiddlewares.values());
        const length = functions.length;
        let pointer = 0;
        // Prepare the function that allow other middlewares to be executed is current request should continue.
        const next = async () => {
            pointer++;
            // Pick the first next function available.
            while ( pointer < length && typeof functions[pointer] !== 'function' ){
                pointer++;
            }
            if ( pointer < length ){
                await functions[pointer](request, response, next);
            }
        }
        // Get the first available function.
        while ( pointer < length && typeof functions[pointer] !== 'function' ){
            pointer++;
        }
        if ( pointer < length ){
            await functions[pointer](request, response, next);
        }
        const ok = length <= pointer;
        if ( !ok ){
            // Close the request.
            response.end();
        }
    }

    /**
     * Adds some additional required properties and features to both the request and the response objects.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @private
     */
    async _prepareRequest(request, response){
        // Create the custom request and append the helper functions to the request response.
        if ( request.processedByLala !== true ){
            await Request.prepareRequest(request, response);
            request.server = this;
        }
        if ( response.processedByLala !== true ){
            Request.prepareResponse(response);
        }
    }

    /**
     * Generates the stream to use to compress data to send to the client according to defined settings and client accepted algorithms.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     *
     * @returns {(BrotliCompress|DeflateCompress|GzipCompress|null)} An instance of the class representing the chosen stream or null if no compression stream can be used.
     *
     * @private
     */
    _createCompressionStream(request){
        const acceptEncoding = request.headers['accept-encoding'];
        if ( acceptEncoding === '' || typeof acceptEncoding !== 'string' ){
            return null;
        }
        if ( this._brotli === true && acceptEncoding.indexOf(' br') !== -1 && typeof zlib.createBrotliCompress === 'function' ){
            return {
                compressor: zlib.createBrotliCompress(),
                contentEncoding: 'br'
            };
        }
        if ( this._deflate === true && acceptEncoding.indexOf(' deflate') !== -1 ){
            return {
                compressor: zlib.createDeflate(),
                contentEncoding: 'deflate'
            };
        }
        if ( this._gzip === true && acceptEncoding.indexOf(' gzip') !== -1 ){
            return {
                compressor: zlib.createGzip(),
                contentEncoding: 'gzip'
            };
        }
        return null;
    }

    _processHeaders(response){

    }

    /**
     * Sends given data to the client as an HTTP response.
     *
     * @param {*} data Some data that will be sent to the client.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @private
     */
    async _writeResponse(data, request, response){
        if ( response.finished === false ) {
            const compression = this._createCompressionStream(request);
            const stream = new Readable();
            let contentType = 'text/plain';
            if ( data !== null ){
                switch ( typeof data ){
                    case 'boolean':
                    case 'number':
                    case 'bigint': {
                        // Primitive values are sent as a string representation.
                        stream.push(data.toString());
                    }break;
                    case 'object': {
                        if ( data instanceof View ){
                            // Render the view and returns the compiled HTML content.
                            const output = await data.render();
                            stream.push(output);
                            contentType = 'text/html';
                        }else{
                            // Return a JSON representation of the object.
                            stream.push(JSON.stringify(data));
                            contentType = 'application/json';
                        }
                    }break;
                    case 'string': {
                        stream.push(data);
                    }break;
                    case 'function':{
                        // Execute the function and then re-process its output.
                        const output = await data();
                        await this._writeResponse(output, request, response);
                    }break;
                }
            }
            // Close current stream.
            stream.push(null);
            if ( response.headersSent === false ){
                if ( typeof response.getHeader('Content-Type') === 'undefined' ){
                    // Set response content type if no custom content type has been defined.
                    response.setHeader('Content-Type', contentType);
                }
                if ( compression !== null ){
                    // Set headers to indicate to the client what compression algorithm is going to be used.
                    response.setHeader('Vary', 'Accept-Encoding');
                    response.setHeader('Content-Encoding', compression.contentEncoding);
                    // Set additional headers.
                    this._processHeaders(response);
                    response.writeHead(200);
                    // Compress and send the response to the client as a stream.
                    stream.pipe(compression.compressor).pipe(response);
                    return;
                }
                this._processHeaders(response);
                response.writeHead(200);
                // Stream the response to the client without any transformation.
                stream.pipe(response);
            }
        }
    }

    /**
     * Handles an exception thrown during request processing according to defined exception handlers.
     *
     * @param {(Error|Exception)} exception The exception to handle as an instance of the native class Error or the built-in class Exception.
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @private
     */
    async _handleException(exception, request, response){
        this.emit('exception', exception, request, response, this);
        const handler = this._exceptionHandlers.get(exception.constructor);
        if ( typeof handler === 'function' ){
            // Call the custom exception handler.
            await handler(exception, request, response);
            return;
        }
        if ( typeof this._defaultExceptionHandler === 'function' ){
            // Call the exception handler defined as default.
            await this._defaultExceptionHandler(exception, request, response);
            return;
        }
        switch ( exception.constructor.name ){
            case 'NotFoundHTTPException': {
                response.throwStandardError(404, 'Not Found', {
                    message: 'Page not found',
                    subMessage: 'Lala is really sorry, but she cannot help you finding what you\'re looking for...'
                });
            }break;
            case 'ForbiddenHTTPException':
            case 'RequestRejectedException': {
                response.throwStandardError(403, 'Forbidden', {
                    message: 'You cannot see this page',
                    subMessage: 'Geez, you should not even be here!'
                });
            }break;
            case 'UserNotFoundException':
            case 'TokenExpiredException':
            case 'InvalidCredentialsHTTPException': {
                if ( request.authenticator !== null ){
                    await request.authenticator.requestAuthentication(request, response);
                    response.throwStandardError(401, 'Unauthorized');
                    response.end();
                    return;
                }
                response.throwStandardError(403, 'Forbidden', {
                    message: 'You cannot see this page',
                    subMessage: 'Geez, you should not even be here!'
                });
            }break;
            case 'MethodNotAllowedHTTPException': {
                response.throwStandardError(405, 'Method Not Allowed');
            }break;
            case 'UnauthorizedHTTPException': {
                response.throwStandardError(401, 'Unauthorized');
            }break;
            case 'AuthenticationRequiredHTTPException': {
                if ( request.authenticator !== null ){
                    await request.authenticator.requestAuthentication(request, response);
                }
                response.throwStandardError(401, 'Unauthorized');
            }break;
            default: {
                Logger.reportError(exception);
                response.throwStandardError(505, 'Internal Server Error');
            }break;
        }
    }

    /**
     * Handles a client request executing the access middlewares defined, this method should be overridden and reimplemented according to the server extending this class.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @return {Promise<null>}
     *
     * @async
     * @private
     */
    async _handleRequest(request, response){
        try{
            await this._prepareRequest(request, response);
            await this._runAccessMiddlewares(request, response);
            return null;
        }catch(ex){
            await this._handleException(ex, request, response);
        }
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Server' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {Router[]} _routers A sequential array containing all the routers that will handle the server requests.
         *
         * @private
         */
        this._routers = [];

        /**
         * @type {null} _server An object representing the server implementation instantiated from a native or external module.
         *
         * @private
         */
        this._server = null;

        /**
         * @type {boolean} _running If set to "true" it means that this server is currently running and listening for requests.
         *
         * @private
         */
        this._running = false;

        /**
         * @type {Map<string, function>} A map containing all the middlewares that will be executed in order to check if a request can be processed or if it should be blocked.
         *
         * @private
         */
        this._accessMiddlewares = new Map();

        /**
         * @type {{string: *}} _options An object containing the custom options that should be considered when a server is created.
         *
         * @private
         */
        this._options = {};

        /**
         * @type {Map<function, function>} _exceptionHandlers A map containing as key the class representing exception to handle and as value the handler function.
         *
         * @private
         */
        this._exceptionHandlers = new Map();

        /**
         * @type {(function|null)} _defaultExceptionHandler A function that is invoked whenever no handler has been defined for a particular exception.
         *
         * @private
         */
        this._defaultExceptionHandler = null;

        /**
         * @type {string} _id A string containing an unique ID for this server used for caching purposes, the ID is a string representation of an UUID version 4.
         *
         * @private
         */
        this._id = generateUUID(4, false);

        /**
         * @type {boolean} _gzip If set to "true" it means that if a client accepts GZip compression, it will be considered as compression algorithm for response, behind deflate and Brotli.
         *
         * @private
         */
        this._gzip = true;

        /**
         * @type {boolean} _deflate If set to "true" it means that if a client accepts Deflate compression, it will be considered behind the Brotli algorithm.
         *
         * @private
         */
        this._deflate = true;

        /**
         * @type {boolean} _brotli If set to "true" it means that if a client accepts Brotli compression it will be used as the first candidate, over Deflate and GZip.
         *
         * @private
         */
        this._brotli = true;

        /**
         * @type {boolean} _autoCompression If set to "true" it means that the server will chose the best algorithm based on the type of content to serve.
         *
         * @private
         */
        this._autoCompression = true;
    }

    /**
     * Sets if the client response can be compressed using the GZip algorithm, this method is chainable.
     *
     * @param enable If set to "true" GZip will be added to the list of the available compression algorithms.
     *
     * @returns {HTTPServer}
     */
    setGZip(enable){
        this._gzip = enable !== true;
        return this;
    }

    /**
     * Returns if the client response can be compressed using the GZip algorithm.
     *
     * @returns {boolean} If GZip compression has been enabled will be returned "true".
     */
    getGZip(){
        return this._gzip !== false;
    }

    /**
     * 
     *
     * @param enable
     *
     * @returns {HTTPServer}
     */
    setDeflate(enable){
        this._deflate = enable !== true;
        return this;
    }

    getDeflate(){
        return this._deflate !== false;
    }

    setBrotli(enable){
        this._brotli = enable !== true;
        return this;
    }

    getBrotli(){
        return this._brotli !== false;
    }

    /**
     * Adds a function to invoke when a specified exception occurs.
     *
     * @param {function} exception The class representing the exception to handle.
     * @param {function} handler The function that will be invoked whenever the specified exception is thrown, use null to remove the custom handler for this exception.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid handler function is given.
     */
    addExceptionHandler(exception, handler){
        if ( handler === null ){
            this._exceptionHandlers.delete(exception);
            return this;
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler function.', 1);
        }
        this._exceptionHandlers.set(exception, handler);
        return this;
    }

    /**
     *
     *
     * @param exception
     */
    removeExceptionHandler(exception){
        this._exceptionHandlers.delete(exception);
        return this;
    }

    /**
     *
     *
     * @param handlers
     *
     * @returns {Server}
     */
    setExceptionHandlers(handlers){
        if ( !( handlers instanceof Map ) ){
            throw new InvalidArgumentException('Invalid handlers object.', 1);
        }
        this._exceptionHandlers = handlers;
        return this;
    }

    /**
     * Sets the function to invoke to handle those exception for which no custom handler has been defined, this method is chainable.
     *
     * @param {(function|null)} handler The handler function to invoke, if set to null, the internal handler will be used instead.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid function is given.
     */
    setDefaultExceptionHandler(handler){
        if ( handler !== null && typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler function.', 1);
        }
        this._defaultExceptionHandler = handler;
        return this;
    }

    /**
     * Returns the function to invoke to handle those exception for which no custom handler has been defined.
     *
     * @returns {(function|null)} The handler function defined or null if no function has been defined.
     */
    getDefaultExceptionHandler(){
        return this._defaultExceptionHandler;
    }

    /**
     * Returns the unique ID of this server.
     *
     * @returns {string} A string representation of this server ID, an UUID version 4.
     */
    getID(){
        return this._id;
    }

    /**
     * Adds one middleware function invoked whenever a new client establishes a connection with this server, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     *
     * @return {Server}
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
        this._accessMiddlewares.set(identifier, handler);
        return this;
    }

    /**
     * Removes one of the middleware function invoked whenever a new client establishes a connection with this server, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    removeAccessMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        this._accessMiddlewares.delete(identifier);
        return this;
    }

    /**
     * Drops all the defined middleware functions, this method is chainable.
     *
     * @returns {Server}
     */
    dropAccessMiddlewares(){
        this._accessMiddlewares = new Map();
        return this;
    }

    /**
     *
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    setAccessMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        this._accessMiddlewares = new Map();
        for ( let identifier in middlewares ){
            if ( !middlewares.hasOwnProperty(identifier) ){
                continue
            }
            if ( typeof identifier === 'string' && identifier !== '' && typeof middlewares === 'function' ){
                this._accessMiddlewares.set(identifier, middlewares[identifier]);
            }
        }
        return this;
    }

    /**
     * Returns all the defined middleware functions invoked whenever a new client establishes a connection with this server.
     *
     * @returns
     */
    getAccessMiddlewares(){
        return this._accessMiddlewares;
    }

    /**
     * Sets the custom option to consider in server creation, this method is chainable.
     *
     * @param options An object having as key a string and as value the option value containing all the custom options to consider.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid object.');
        }
        this._options = options !== null ? options : {};
        return this;
    }

    /**
     * Returns the custom option to consider in server creation.
     *
     * @return {{string: *}} An object containing all the custom options defined.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Returns if this server is currently running and listening for requests.
     *
     * @returns {boolean} If this server is ready to handle requests will be returned "true".
     */
    isRunning(){
        return this._running === true;
    }

    /**
     * Starts the server, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async start(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Stops the server, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async stop(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Restarts the server, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async restart(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Server;