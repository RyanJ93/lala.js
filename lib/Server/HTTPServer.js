'use strict';

// Including native modules.
const http = require('http');

// Including Lala's modules.
const HTTPCore = require('./HTTPCore');
const {
    InvalidArgumentException,
    RuntimeException,
    MisconfigurationException
} = require('../Exceptions');

/**
 * @typedef {Object} RandomPortOptions An object defining the accepted options for server's random port generation.
 *
 * @property {number[]} [excluded=[]] A sequential array of numbers containing all the ports that cannot be used usually because already taken.
 * @property {number} [min=1024] An integer number greater than zero representing the lowest port number that can be generated.
 * @property {number} [max=65535] An integer number greater than zero representing the greatest port number that can be generated.
 */

/**
 * This class allows to create a server using the plain HTTP protocol.
 */
class HTTPServer extends HTTPCore {
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
                min: 1024,
                max: 65535
            };
        }
        if ( !Array.isArray(options.excluded) ){
            options.excluded = [];
        }
        if ( options.min === null || isNaN(options.min) || options.min <= 0 ){
            options.min = 1024;
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
     * Adds a given connection to the list of all the active connections of this server.
     *
     * @param {module:net.Socket} connection An instance of the native class "Socket" representing the connection to track.
     *
     * @protected
     */
    _trackConnection(connection){
        super._trackConnection(connection);
        // Add an event listener to remove this connection from the list once closed.
        connection.on('close', () => {
            this._untrackConnection(connection);
        });
    }

    /**
     * Emits all the events supported by the built-in http module.
     *
     * @protected
     */
    _forwardEvents(){
        this._server.on('checkContinue', (request, response) => this.emit(request, response));
        this._server.on('checkExpectation', (request, response) => this.emit(request, response));
        this._server.on('clientError', (exception, socket) => this.emit(exception, socket));
        this._server.on('close', () => this.emit);
        this._server.on('connect', (request, socket, head) => this.emit(request, socket, head));
        this._server.on('upgrade', (request, socket, head) => this.emit(request, socket, head));
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
                // TODO: Add support for logger.
                console.log(error);
                this.emit('error', error);
            });
            // Bind the event handler for client requests.
            this._server.on('request', async (request, response) => {
                await this._handleRequest(request, response);
                this.emit('request', request, response);
            });
            // Bind the event handler used to track client requests.
            this._server.on('connection', (connection) => {
                this._trackConnection(connection);
                this.emit('connection', connection);
            });
            // Emit all events supported by the built-in http module.
            this._forwardEvents();
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
    }

    /**
     * Sets the address the server will accept requests on, this method is chainable.
     *
     * @param {?string}  host A string containing the address, if set to null, requests will be accepted on the unspecified address "0.0.0.0" (or "::" for IPv6 protocol).
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
     * @returns {?string} A string containing the address, if no specific address has been defined, null will be returned instead.
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
     * @param {RandomPortOptions} [options] An object containing the additional option to pass to the port generator, such as min and max value and ports to avoid.
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
        if ( this._port === null || this._port <= 0 || this._port > 65535 ){
            throw new MisconfigurationException('No port defined.', 1);
        }
        if ( rebuild === true ){
            // Stop currently running server, if running.
            await this.stop();
            // Force server rebuilding.
            this._server = null;
        }
        // Create the server object before starting it.
        this._createHTTPServer();
        if ( this.isRunning() !== true ){
            await (new Promise((resolve, reject) => {
                // Start the server.
                this._server.listen(this._port, (error) => {
                    return typeof error === 'undefined' ? resolve() : reject(new RuntimeException(error, 2));
                });
            }));
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
                        this._connections.clear();
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
     */
    isRunning(){
        return this._server !== null && this._server.listening;
    }
}

module.exports = HTTPServer;
