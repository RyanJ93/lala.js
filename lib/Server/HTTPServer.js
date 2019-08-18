'use strict';

// Including native modules.
const http = require('http');

// Including Lala's modules.
const HTTPCookieProcessor = require('./processors/HTTP/HTTPCookieProcessor');
const {
    HTTPCookieProcessorFactory,
    HTTPRequestProcessorFactory,
    HTTPExceptionHandlerFactory,
    HTTPInputProcessorFactory,
    HTTPSessionProcessorFactory
} = require('./processors/factories/HTTP');
const RoutedServer = require('./RoutedServer');
const { generateUUID } = require('../helpers');
const {
    InvalidArgumentException,
    RuntimeException,
    MisconfigurationException
} = require('../Exceptions');

/**
 * @typedef RandomPortOptions An object defining the accepted options for server's random port generation.
 *
 * @property {number[]} [options.excluded=[]] A sequential array of numbers containing all the ports that cannot be used usually because already taken.
 * @property {number} [options.min=1] An integer number greater than zero representing the lowest port number that can be generated.
 * @property {number} [options.max=65535] An integer number greater than zero representing the greatest port number that can be generated.
 */

/**
 * This class allows to create a server using the plain HTTP protocol.
 */
class HTTPServer extends RoutedServer {
    /**
     * Generates a random port ensuring that the it is available to use.
     *
     * @param {?RandomPortOptions} [options] An object containing the options for the port generation such as min and max value and ports to avoid.
     *
     * @return {?number} An integer number greater than zero and lower or equal than 65535 representing the port number found, if no port number was found, null will be returned instead.
     */
    static getRandomPort(options = null){
        if ( options === null || typeof options !== 'object' ){
            // Set the default options if no custom option has been defined.
            options = {
                excluded: [],
                min: 1,
                max: 65535
            };
        }
        if ( !Array.isArray(options.excluded) ){
            options.excluded = [];
        }
        if ( options.min === null || isNaN(options.min) || options.min <= 0 ){
            options.min = 1;
        }
        if ( options.min > 65535 ){
            options.min = 65535;
        }
        if ( options.max === null || isNaN(options.max) || options.max > 65535 ){
            options.max = 65535;
        }
        if ( options.max <= 0 ){
            options.max = 0;
        }
        let port = options.min >= options.max ? options.max : null;
        while ( port === null ){
            // Generate the port number taking care of defined range.
            port = Math.floor(( Math.random() * options.max ) - options.min);
            if ( options.excluded.indexOf(port) !== -1 ){
                port = null;
                continue;
            }
            // Probe the port to find out if it is available or not.
            const server = http.createServer();
            server.on('error', (error) => {
                if ( error.code === 'EACCES' ){
                    port = null;
                }
            });
            server.listen(port);
            server.close();
        }
        return port;
    }

    /**
     * Parses cookies sent by the client and then add them into the request object, plus, it injects cookie helper functions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @protected
     */
    _prepareCookies(request, response){
        const processor = this._cookieProcessorFactory.craft();
        // Parse cookies sent over the HTTP request.
        processor.appendCookies(request);
        // Injects some helper functions useful when dealing with cookies.
        processor.appendHelpers(response);
        request.cookieProcessor = processor;
    }

    /**
     * Processes client sessions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    async _prepareSessions(request, response){
        const processor = this._sessionProcessorFactory.craft();
        // TODO: Add session support, task #LALA-13.
    }

    /**
     * Processes request data, such as POST parameters and uploaded files, cookies and HTTP sessions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @override
     * @protected
     */
    async _prepareRequest(request, response){
        await super._prepareRequest(request, response);
        // Processing HTTP cookies.
        this._prepareCookies(request, response);
        // Processing HTTP sessions.
        await this._prepareSessions(request, response);
    }

    /**
     * Generates a response for the client according to data defined in the "rawOutput" property inside the "request" object given.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @override
     * @protected
     */
    async _processOutput(request, response){
        if ( response.hasOwnProperty('finished') && response.finished === false ) {
            if ( request.hasOwnProperty('cookieProcessor') && request.cookieProcessor instanceof HTTPCookieProcessor ){
                // Generate the HTTP header that contains cookie to store on client side.
                request.cookieProcessor.writeHeader(response);
            }
        }
        await super._processOutput(request, response);
    }

    /**
     * Generates a new HTTP server using the built-in module.
     *
     * @protected
     */
    _createHTTPServer(){
        if ( this._server === null ){
            // Define server options based on class properties then merge all them with custom options defined.
            const options = Object.assign({
                host: ( this._host !== '' && typeof this._host === 'string' ? this._host : null ),
                ipv6Only: ( this._ipv6Only === true )
            }, this._options);
            // Create a new HTTP server.
            this._server = http.createServer(options);
            // Bind event handlers.
            this._bindEventHandlers();
        }
    }

    /**
     * Sets the handler functions for all the required events fired by the created server.
     *
     * @protected
     */
    _bindEventHandlers(){
        if ( this._server !== null ){
            // Bind the event handler for errors.
            this._server.on('error', (error) => {
                console.log(error);
            });
            // Bind the event handler for client requests.
            this._server.on('request', async (request, response) => {
                await this._handleRequest(request, response);
            });
            this._server.on('connection', (connection) => {
                connection.connectionID = generateUUID(4, false);
                this._connections.set(connection.connectionID, connection);
                connection.on('close', () => {
                    this._connections.delete(connection.connectionID);
                });
            });
        }
    }

    /**
     * The cass constructor.
     *
     * @param {?number} [port] An integer number greater than zero and lower or equal than 65535 representing the port where the server will be listen at, if not defined, 80 will be used as default port.
     */
    constructor(port = null) {
        super();

        /**
         * @type {?string} _host A string containing the address the server will accept requests on, if null, the server will accept requests on the unspecified address "0.0.0.0" (or "::" for IPv6 protocol).
         *
         * @protected
         */
        this._host = null;

        /**
         * @type {number} [_port=80] An integer number greater than zero and lower or equal than 65535 representing the port where the server will be listen at.
         *
         * @protected
         */
        this._port = port !== null && !isNaN(port) && port > 0 && port <= 65535 ? port : 80;

        /**
         * @type {boolean} [_ipv6Only=false] Defines if this server should accept connection having an IPv6 address or both IPv4 and IPv6.
         *
         * @protected
         */
        this._ipv6Only = false;

        /**
         * @type {?Server} _server An instance of the class "Server" representing the server created using the native Node.js APIs.
         *
         * @protected
         */
        this._server = null;

        /**
         * @type {Map<string, module:http.Socket>} _connections A map containing all the sockets currently connected to this server having as key the connection unique ID and as value and instance of the class "Socket" representing the connection.
         *
         * @protected
         */
        this._connections = new Map();

        /**
         * @type {HTTPCookieProcessorFactory} _cookieProcessorFactory An instance of the class "HTTPCookieProcessorFactory" used to configure and then generate instance of the class "HTTPCookieProcessor".
         *
         * @protected
         */
        this._cookieProcessorFactory = new HTTPCookieProcessorFactory();

        /**
         * @type {HTTPSessionProcessorFactory} _sessionProcessorFactory An instance of the class "HTTPSessionProcessorFactory" used to configure and then generate instance of the class "HTTPSessionProcessor".
         *
         * @protected
         */
        this._sessionProcessorFactory = new HTTPSessionProcessorFactory();

        // Defines the HTTP specific processor factories.
        this._requestProcessorFactory = new HTTPRequestProcessorFactory();
        this._exceptionProcessorFactory = new HTTPExceptionHandlerFactory();
        this._inputProcessorFactory = new HTTPInputProcessorFactory();
    }

    /**
     * Sets the factory class to use whenever generating instances of the "HTTPCookieProcessor" class, this method is chainable.
     *
     * @param {HTTPCookieProcessorFactory} factory An instance of the class "HTTPCookieProcessorFactory" representing the factory class to use.
     *
     * @returns {HTTPServer}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setHTTPCookieProcessorFactory(factory){
        if ( !this._validateProcessorClass('cookie', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._cookieProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "HTTPCookieProcessor" class.
     *
     * @returns {HTTPCookieProcessorFactory} An instance of the class "HTTPCookieProcessorFactory" representing the factory class in use.
     */
    getHTTPCookieProcessorFactory(){
        return this._cookieProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "HTTPSessionProcessor" class, this method is chainable.
     *
     * @param factory An instance of the class "HTTPSessionProcessorFactory" representing the factory class to use.
     *
     * @returns {HTTPServer}
     */
    setHTTPSessionProcessorFactory(factory){
        if ( !this._validateProcessorClass('session', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._sessionProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "HTTPSessionProcessor" class.
     *
     * @returns {HTTPSessionProcessorFactory} An instance of the class "HTTPCookieProcessorFactory" representing the factory class in use.
     */
    getHTTPSessionProcessorFactory(){
        return this._sessionProcessorFactory;
    }

    /**
     * Sets the address the server will accept requests on, this method is chainable.
     *
     * @param {(string|null)} host A string containing the address, if set to null, requests will be accepted on the unspecified address "0.0.0.0" (or "::" for IPv6 protocol).
     *
     * @returns {HTTPServer}
     *
     * @throws {InvalidArgumentException} If an invalid address is given.
     */
    setHost(host){
        if ( host !== null && ( host === '' || typeof host !== 'string' ) ){
            throw new InvalidArgumentException('Invalid address.', 1);
        }
        this._host = host;
        return this;
    }

    /**
     * Returns the address the server will accept requests on.
     *
     * @returns {(string|null)} A string containing the address, if no specific address has been defined, null will be returned instead.
     */
    getBind(){
        return this._host;
    }

    /**
     * Sets the port number where the server will listen at, this method is chainable.
     *
     * @param {number} port An integer number greater than zero and lower or equal than 65535 representing the port number.
     *
     * @returns {HTTPServer}
     *
     * @throws {InvalidArgumentException} If an invalid port number is given.
     */
    setPort(port){
        if ( port === null || isNaN(port) || port <= 0 || port > 65535 ){
            throw new InvalidArgumentException('Invalid port number, it must be between 1 and 65535.', 1);
        }
        this._port = port;
        return this;
    }

    /**
     * Returns the port where the server will listen at.
     *
     * @returns {number} An integer number greater than zero and lower or equal than 65535 representing the port number.
     */
    getPort(){
        return this._port;
    }

    /**
     * Generates and uses a random port, then returns the generated port.
     *
     * @param {object} [options] An object containing the additional option to pass to the port generator, such as min and max value and ports to avoid.
     *
     * @return {number} An integer number greater than zero and lower or equal than 65535 representing the generated port.
     *
     * @throws {RuntimeException} If no available port was found matching given options.
     */
    useRandomPort(options){
        // Generate a random port.
        const port = HTTPServer.getRandomPort(options);
        if ( port === null ){
            throw new RuntimeException('No available port found.', 1);
        }
        this.setPort(port);
        return port;
    }

    /**
     * Sets if only requests from clients using the IPv6 stack should be accepted rather than both stacks, this method is chainable.
     *
     * @param {boolean} IPv6 If set to "true", requests from clients using IPv4 will be ignored.
     *
     * @returns {HTTPServer}
     */
    setIPv6Only(IPv6){
        this._ipv6Only = IPv6 === true;
        return this;
    }

    /**
     * Returns if only requests from clients using the IPv6 stack should be accepted rather than both stacks.
     *
     * @returns {boolean}
     */
    getIPv6Only(){
        return this._ipv6Only === true;
    }

    /**
     * Returns the classes used in processor validation.
     *
     * @returns {Object.<string, function>} An object having as key the processor identifier and as value the processor class.
     */
    getProcessorClasses(){
        return Object.assign(super.getProcessorClasses(), {
            cookie: HTTPCookieProcessorFactory,
            session: HTTPSessionProcessorFactory,
            request: HTTPRequestProcessorFactory,
            exception: HTTPExceptionHandlerFactory,
            input: HTTPInputProcessorFactory
        });
    }

    /**
     * Starts the server.
     *
     * @param {boolean} [rebuild=false] If set to "true", before starting the server, a new server will be built, useful to refresh server configuration.
     *
     * @returns {Promise<void>}
     *
     * @throws {MisconfigurationException} If no port has been defined.
     * @throws {RuntimeException} If an error occurs when starting the server.
     *
     * @async
     */
    async start(rebuild = false){
        const port = this._port;
        if ( port === null || port <= 0 || port > 65535 ){
            throw new MisconfigurationException('No port defined.', 1);
        }
        if ( rebuild === true ){
            // Force server rebuilding.
            this._server = null;
            this._running = false;
        }
        // Create the server object before starting it.
        this._createHTTPServer();
        if ( this._running !== true ){
            await (new Promise((resolve, reject) => {
                // Start the server.
                this._server.listen(port, (error) => {
                    return typeof error === 'undefined' ? resolve() : reject(new RuntimeException(error, 1));
                });
            }));
            this._running = true;
        }
    }

    /**
     * Stops the server.
     *
     * @returns {Promise<void>}
     *
     * @throws {RuntimeException} If an error occurs when stopping the server.
     *
     * @async
     */
    async stop(){
        if ( this.isRunning() ){
            await (new Promise((resolve, reject) => {
                // Stop the server.
                this._server.close((error) => {
                    if ( typeof error !== 'undefined' ){
                        reject(new RuntimeException(error, 1));
                    }else{
                        for ( const connection of this._connections.values() ){
                            connection.destroy();
                        }
                        this._connections = new Map();
                        resolve();
                    }
                });
            }));
        }
    }

    /**
     * Restarts the server.
     *
     * @param {boolean} [rebuild=false] If set to "true", before starting the server, a new server will be built.
     *
     * @returns {Promise<void>}
     *
     * @throws {RuntimeException} If an error occurs when stopping or starting the server.
     *
     * @async
     */
    async restart(rebuild = false){
        await this.stop();
        await this.start(rebuild);
    }

    /**
     * Returns if this server is currently running and listening for requests.
     *
     * @returns {boolean} If this server is ready to handle requests will be returned "true".
     *
     * @async
     */
    isRunning(){
        return this._server !== null && this._server.listening;
    }

    /**
     * Returns all the sockets currently connected to this server.
     *
     * @returns {Map<string, module:http.Socket>} A map having as key an unique ID associated to the connection and as value an instance of the native "Socket" class representing the connection.
     */
    getConnections(){
        return this._connections;
    }

    /**
     * Returns how many sockets are currently connected to this server.
     *
     * @returns {number} An integer number greater or equal than zero.
     */
    getConnectionsCount(){
        return this._connections.size;
    }
}

module.exports = HTTPServer;
