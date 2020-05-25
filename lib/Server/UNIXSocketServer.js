'use strict';

// Including native modules.
const net = require('net');
const filesystem = require('fs');

// Including Lala's modules.
const HTTPCore = require('./HTTPCore');
const { generateUUID } = require('../Helpers/helpers/BuiltInHelpers');
const {
    InvalidArgumentException,
    RuntimeException,
    MisconfigurationException
} = require('../Exceptions');

/**
 * Allows to create HTTP based server listening over a UNIX socket file.
 */
class UNIXSocketServer extends HTTPCore {
    /**
     * Generates a new HTTP server using the built-in module.
     *
     * @protected
     */
    _createServer(){
        if ( this._server === null ){
            // Create a new HTTP server.
            this._server = net.createServer(this._options);
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
            // TODO
        }
    }

    /**
     * The class constructor.
     *
     * @param {?string} path A string containing the path to the UNIX socket.
     */
    constructor(path = null){
        super();

        /**
         * @type {?String} [_path] A string containing the path to the UNIX socket file where this server will listen at.
         *
         * @protected
         */
        this._path = path !== '' && typeof path === 'string' ? path : null;
    }

    /**
     * Sets the path to the UNIX socket where this server will receive requests, this method is chainable.
     *
     * @param {string} path A string containing the path to the socket file.
     *
     * @returns {UNIXSocketServer}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPath(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid sock path.', 1);
        }
        this._path = path;
        return this;
    }

    /**
     * Returns the path to the UNIX socket file where this server will receive requests.
     *
     * @returns {?string} A string containing the path defined or null if no path has been defined yet.
     */
    getPath(){
        return this._path;
    }

    /**
     * Generates and use a UNIX socket file, then returns the generated filename.
     *
     * @param {?string} [directory] A string representing he path to the directory that will contain the generated UNIX socket file, if set to null, "/tmp" will be used.
     *
     * @returns {string} A string containing the generated filename.
     *
     * @throws {InvalidArgumentException} If an invalid directory path is given.
     */
    useRandomPath(directory = null){
        if ( directory !== null && ( directory === '' || typeof directory !== 'string' ) ){
            throw new InvalidArgumentException('Invalid directory.', 1);
        }
        if ( directory === null ){
            directory = '/tmp';
        }
        // Generate the UNIX socket filename as an UUID version 4.
        let sock = generateUUID(4, false) + '.sock';
        // Check if it doesn't exist, otherwise generate a new one.
        while ( filesystem.existsSync(directory + '/' + sock) ){
            sock = generateUUID(4, false) + '.sock';
        }
        // Use the generated filename.
        this._path = directory + '/' + sock;
        return sock;
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
        if ( this._path === null ){
            throw new MisconfigurationException('No socket path defined.', 1);
        }
        if ( rebuild === true ){
            // Force server rebuilding.
            this._server = null;
            this._running = false;
        }
        // Create the server object before starting it.
        this._createServer();
        if ( this._running !== true ){
            await (new Promise((resolve, reject) => {
                // Start the server.
                this._server.listen(this._path, (error) => {
                    return typeof error === 'undefined' ? resolve() : reject(new RuntimeException(error, 2));
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
                        return reject(new RuntimeException(error, 1));
                    }
                    resolve();
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

module.exports = UNIXSocketServer;
