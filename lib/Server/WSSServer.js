'use strict';

// Including third part modules.
const WebSocket = require('ws');

// Including Lala's modules.
const HTTPSServer = require('./HTTPSServer');
const WSServer = require('./WSServer');
const { mixin } = require('../helpers');

/**
 * This class allows to create a server using the WebSocket protocol supporting the TLS encryption protocol.
 */
class WSSServer extends mixin(WSServer, HTTPSServer) {
    /**
     * Generates a new WebSocket server using the third part module "ws".
     *
     * @override
     * @protected
     */
    _buildWSServer(){
        // Generate the non-SSL WebSocket server version.
        super._buildWSServer();
        if ( this._SSLServer !== null ){
            // Generate the WebSocket server based on the HTTP that has been instantiated.
            this._WSSServer = new WebSocket.Server(Object.assign(this._WSSOptions, {
                noServer: true
            }));
            // Bind event handlers.
            this._SSLServer.on('upgrade', async (request, socket, head) => {
                try{
                    // Set references to this server and internal supporting servers.
                    request.HTTPServer = this._SSLServer;
                    request.WSServer = this._WSSServer;
                    request.server = this;
                    await this._handleUpgrade(request, socket, head);
                }catch(ex){
                    // Process the exception according to handler functions defined.
                    await this._processWSConnectionException(ex, request, socket);
                }
            });
        }
    }

    /**
     * The class constructor.
     *
     * @param {?number} [port] An integer number greater than zero and lower or equal than 65535 representing the port where the server will be listen at, if not defined, 80 will be used as default port.
     * @param {?number} [SSLPort] An integer number greater than zero and lower or equal than 65535 representing the port where the SSL server will be listen at, if not defined, 443 will be used as default port.
     */
    constructor(port = null, SSLPort = null){
        super(port, SSLPort);

        /**
         * @type {WebSocket.Server} [_WSSServer] An instance of the class "Server" from the "ws" module representing the WebSocket server generated based on the HTTPS server.
         *
         * @protected
         */
        this._WSSServer = null;

        /**
         * @type {Object.<string, *>} _WSSOptions Some custom options to pass to the SSL version of the WebSocket server.
         *
         * @protected
         */
        this._WSSOptions = {};
    }

    /**
     * Sets some custom options that will be considered during SSL WebSocket server building, this method is chainable.
     *
     * @param {?Object.<string, *>} options Some custom options to pass to the WebSocket server.
     *
     * @returns {WSSServer}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setWSSOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.');
        }
        this._WSSOptions = options === null ? {} : options;
        return this;
    }

    /**
     * Returns all the custom options that have been defined and that will be considered during SSL WebSocket server building.
     *
     * @returns {Object<string, *>} An object containing the custom options defined.
     */
    getWSSOptions(){
        return this._WSSOptions;
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
        await super.start(rebuild);
        // Generate the WebSocket server based on the HTTP server generated.
        this._buildWSServer();
    }
}

module.exports = WSSServer;
