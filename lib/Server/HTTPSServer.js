'use strict';

// Including native modules.
const tls = require('tls');
const https = require('https');
const http2 = require('http2');

// Including Lala's modules.
const HTTPServer = require('./HTTPServer');
const TLSContext = require('../Types/TLSContext');
const {
    InvalidArgumentException,
    BadMethodCallException,
    MisconfigurationException
} = require('../Exceptions');

/**
 * @callback SNIResolveCallback The callback function provided by the SNI implementation shipped with the native HTTPS server implementation.
 *
 * @param {null} idk Some parameter that should be set to "null".
 * @param {module:tls.SecureContext} context THe TLS context that should provide a new private key and certificate according to the request hostname.
 */

/**
 * This class allows to create a server using the HTTP protocol over a TLS secure layer.
 */
class HTTPSServer extends HTTPServer {
    /**
     * Redirects non-HTTPS requests to the HTTPS server if the redirect option has been enabled for this server.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @protected
     */
    _redirectToSSL(request, response){
        const host = request.headers.hasOwnProperty('host') ? request.headers.host.split(':')[0] : '';
        if ( host === '' ){
            response.writeHead(400, 'Bad Request');
            response.end();
        }else{
            const url = 'https://' + ( this._SSLPort === 443 ? host : ( host + ':' + this._SSLPort ) ) + request.url;
            response.writeHead(308, {
                Location: url
            });
            response.end();
        }
    }

    /**
     * Processes a whole client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {(Promise<void>|void)}
     *
     * @async
     * @protected
     */
    _handleRequest(request, response){
        if ( this._redirect !== false && request.connection.encrypted !== true ){
            return this._redirectToSSL(request, response);
        }
        return super._handleRequest(request, response);
    }

    /**
     * Emits all the events supported by the built-in https module.
     *
     * @protected
     */
    _forwardSSLEvents(){
        this._SSLServer.on('checkContinue', (request, response) => this.emit(request, response));
        this._SSLServer.on('checkExpectation', (request, response) => this.emit(request, response));
        this._SSLServer.on('clientError', (exception, socket) => this.emit(exception, socket));
        this._SSLServer.on('close', () => this.emit);
        this._SSLServer.on('connect', (request, socket, head) => this.emit(request, socket, head));
        this._SSLServer.on('upgrade', (request, socket, head) => this.emit(request, socket, head));
    }

    /**
     * Sets the handler functions for all the required events fired by the HTTPS server.
     *
     * @protected
     */
    _bindSSLEventHandlers(){
        if ( this._SSLServer !== null ){
            // Bind the event handler for errors.
            this._SSLServer.on('error', (error) => {
                // TODO: Add support for logger.
                console.log(error);
                this.emit('error', error);
            });
            // Bind the event handler for client requests.
            this._SSLServer.on('request', async (request, response) => {
                await this._handleRequest(request, response);
                this.emit('request', request, response);
            });
            // Bind the event handler used to track client requests.
            this._SSLServer.on('connection', (connection) => {
                this._trackConnection(connection);
                this.emit('connection', connection);
            });
            // Emit all events supported by the built-in http module.
            this._forwardSSLEvents();
        }
    }

    /**
     * Handles the certificate selection according to the SNI protocol and the given hostname.
     *
     * @param {string} hostname A string containing the hostname of the current request.
     * @param {SNIResolveCallback} callback The callback function provided by the internal server API.
     *
     * @protected
     */
    _handleSNI(hostname, callback){
        let context = null;
        const TLSContext = this._TLSContexts.get(hostname);
        if ( typeof TLSContext !== 'undefined' ){
            // A TLS context has been defined for this hostname, let's switch.
            const properties = TLSContext.getProperties();
            context = tls.createSecureContext(properties);
        }
        callback(null, context);
    }

    /**
     * Generates a new HTTPS server using the built-in module.
     *
     * @private
     */
    _createHTTPSServer(){
        if ( this._SSLServer === null ){
            const options = {
                SNICallback: (hostname, callback) => {
                    this._handleSNI(hostname, callback);
                }
            };
            // Generate the default TLS context.
            const TLSContextOptions = this.getTLSContext('*', true).getProperties();
            // Create a new HTTPS server.
            this._SSLServer = https.createServer(Object.assign(TLSContextOptions, this._SSLOptions, options));
            // Bind event handlers.
            this._bindSSLEventHandlers();
        }
    }

    /**
     * The class constructor.
     *
     * @param {?number} [port] An integer number greater than zero and lower or equal than 65535 representing the port where the server will be listen at, if not defined, 80 will be used as default port.
     * @param {?number} [SSLPort] An integer number greater than zero and lower or equal than 65535 representing the port where the SSL server will be listen at, if not defined, 443 will be used as default port.
     */
    constructor(port = null, SSLPort = null){
        super(port);

        /**
         * @type {Map<string, TLSContext>} _TLSContexts A map containing the TLS context for each hostname defined plus the default one ("*").
         *
         * @protected
         */
        this._TLSContexts = new Map();

        /**
         * @type {number} [_SSLPort=443] An integer number greater than zero and lower or equal than 65535 representing the port where the SSL server will be listen at.
         *
         * @protected
         */
        this._SSLPort = SSLPort !== null && !isNaN(SSLPort) && SSLPort > 0 && SSLPort <= 65535 ? SSLPort : 443;

        /**
         * @type {?Server} _server An instance of the class "Server" representing the SSL server created using the native Node.js APIs.
         *
         * @protected
         */
        this._SSLServer = null;

        /**
         * @type {Object.<*, *>} _SSLOptions An object containing the custom options that should be considered when a SSL server is created.
         *
         * @protected
         */
        this._SSLOptions = {};

        /**
         * @type {boolean} [_redirect=true] If set to "true" all the requests to the HTTP server will be redirected to the HTTPS one.
         *
         * @protected
         */
        this._redirect = true;
    }

    /**
     * Sets the TLS context to use with a given hostname.
     *
     * @param {TLSContext} context An instance of the class "TLSContext" representing the TLS context containing the certificates and the security options to use for the given hostname, if set to null, it will be removed.
     * @param {?string} [hostname] A string containing the hostname, if empty or null the default hostname ("*") will be used instead.
     *
     * @returns {HTTPSServer}
     *
     * @throws {InvalidArgumentException} If an invalid context instance is given.
     * @throws {InvalidArgumentException} If an invalid hostname is given.
     * @throws {BadMethodCallException} If an attempt to unset the default TLS context is made as it cannot be removed.
     */
    setTLSContext(context, hostname = null){
        if ( context !== null && !( context instanceof TLSContext ) ){
            throw new InvalidArgumentException('Invalid context.', 1);
        }
        if ( hostname !== null && typeof hostname !== 'string' ){
            throw new InvalidArgumentException('Invalid hostname.', 2);
        }
        if ( hostname === null || hostname === '' ){
            hostname = '*';
        }
        if ( context === null ){
            if ( hostname === '*' ){
                throw new BadMethodCallException('Default TLS context cannot be unset.', 3);
            }
            this._TLSContexts.delete(hostname);
        }else{
            this._TLSContexts.set(hostname, context);
        }
        return this;
    }

    /**
     * Returns the TLS context defined for the given hostname.
     *
     * @param {?string} [hostname] A string containing the hostname, if empty or null the default hostname ("*") will be used instead.
     * @param {boolean} [create=true] If set to "true" and if no context is found for the given hostname it will be created, otherwise an exception will be thrown.
     *
     * @returns {TLSContext} An instance of the class "TLSContext" representing the TLS context found or created.
     *
     * @throws {InvalidArgumentException} If an invalid hostname is given.
     * @throws {MisconfigurationException} If no TLS context has been found for the given hostname and the "create" option has been set to "false".
     */
    getTLSContext(hostname = null, create = true){
        if ( hostname !== null && typeof hostname !== 'string' ){
            throw new InvalidArgumentException('Invalid hostname.', 1);
        }
        if ( hostname === null || hostname === '' ){
            hostname = '*';
        }
        if ( !this._TLSContexts.has(hostname) ){
            if ( create === false ){
                throw new MisconfigurationException('No TLS context found for the given hostname.', 2);
            }
            this._TLSContexts.set(hostname, new TLSContext());
        }
        return this._TLSContexts.get(hostname);
    }

    /**
     * Sets the port number where the HTTPS server will listen at, this method is chainable.
     *
     * @param {number} port An integer number greater than zero and lower or equal than 65535 representing the port number.
     *
     * @returns {HTTPSServer}
     *
     * @throws {InvalidArgumentException} If an invalid port number is given.
     */
    setSSLPort(port){
        if ( port === null || isNaN(port) || port <= 0 || port > 65535 ){
            throw new InvalidArgumentException('Invalid port number, it must be between 1 and 65535.', 1);
        }
        this._SSLPort = port;
        return this;
    }

    /**
     * Returns the port where the HTTPS server will listen at.
     *
     * @returns {number} An integer number greater than zero and lower or equal than 65535 representing the port number.
     */
    getSSLPort(){
        return this._SSLPort;
    }

    /**
     * Generates and uses a random port for the HTTPS server, then returns the generated port.
     *
     * @param {RandomPortOptions} [options] An object containing the additional option to pass to the port generator, such as min and max value and ports to avoid.
     *
     * @return {number} An integer number greater than zero and lower or equal than 65535 representing the generated port.
     *
     * @throws {RuntimeException} If no available port was found matching given options.
     */
    useRandomSSLPort(options){
        // Generate a random port.
        const port = HTTPSServer.getRandomPort(options);
        if ( port === null ){
            throw new RuntimeException('No available port found.', 1);
        }
        this.setSSLPort(port);
        return port;
    }

    /**
     * Sets if non-HTTPS requests should be redirected to the HTTPS server, this method is chainable.
     *
     * @param {boolean} redirect If set to "true" non-HTTPS requests will be redirected to the HTTPS server.
     *
     * @returns {HTTPSServer}
     */
    setRedirect(redirect){
        this._redirect = redirect !== false;
        return this;
    }

    /**
     * Returns if the non-HTTPS requests should be redirected to the HTTPS server.
     *
     * @returns {boolean} If non-HTTPS requests are going to be redirected will be returned "true".
     */
    getRedirect(){
        return this._redirect !== false;
    }

    /**
     * Starts the servers.
     *
     * @param {boolean} [rebuild=false] If set to "true", before starting the servers, both the servers will be built, useful to refresh servers configuration.
     *
     * @returns {Promise<void>}
     *
     * @throws {MisconfigurationException} If no port has been defined for the HTTP server.
     * @throws {MisconfigurationException} If no port has been defined for the HTTPS server.
     * @throws {RuntimeException} If an error occurs when starting the HTTP server.
     * @throws {RuntimeException} If an error occurs when starting the HTTPS server.
     *
     * @async
     */
    async start(rebuild = false){
        await super.start(rebuild);
        const port = this._SSLPort;
        if ( port === null || port <= 0 || port > 65535 ){
            throw new MisconfigurationException('No port defined for SSL server.', 3);
        }
        if ( rebuild === true ){
            // Force server rebuilding.
            this._SSLServer = null;
        }
        // Create the server object before starting it.
        this._createHTTPSServer();
        if ( this.isSSLRunning() !== true ){
            await (new Promise((resolve, reject) => {
                // Start the server.
                this._SSLServer.listen(port, (error) => {
                    return typeof error === 'undefined' ? resolve() : reject(new RuntimeException(error, 4));
                });
            }));
        }
    }

    /**
     * Stops the servers.
     *
     * @returns {Promise<void>}
     *
     * @throws {RuntimeException} If an error occurs when stopping the HTTP server.
     * @throws {RuntimeException} If an error occurs when stopping the HTTPS server.
     *
     * @async
     */
    async stop(){
        await super.stop();
        if ( this.isSSLRunning() ){
            await (new Promise((resolve, reject) => {
                // Stop the server.
                this._SSLServer.close((error) => {
                    if ( typeof error !== 'undefined' ){
                        reject(new RuntimeException(error, 2));
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
     * Returns if the HTTPS server is currently running and listening for requests.
     *
     * @returns {boolean} If the HTTPS server is ready to handle requests will be returned "true".
     */
    isSSLRunning(){
        return this._SSLServer !== null && this._SSLServer.listening;
    }
}

module.exports = HTTPSServer;
