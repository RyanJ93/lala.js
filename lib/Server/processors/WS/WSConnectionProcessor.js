'use strict';

// Including third part modules.
const { Server, WebSocket } = require('ws');

// Including Lala's modules.
const Processor = require('../Processor');
const { generateUUID } = require('../../../helpers');
const {
    UpgradeRejectedHTTPException,
    NotFoundHTTPException
} = require('../../../Exceptions');

/**
 * @callback WSConnectionMiddleware The callback function that is invoked whenever a client connection attempt is processed.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
 * @param {function} next The callback function to invoke in order to keep the middleware chain running, if not invoked client connection will be rejected.
 *
 * @returns {Promise<void>}
 *
 * @async
 */

/**
 * @typedef {Object} WSConnectionProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Set<string>} allowedOrigins A set containing all the domain clients can connect from, this will override denied origins.
 * @property {Set<string>} deniedOrigins A set containing all the domain clients cannot connect from.
 * @property {Map<string, WSConnectionMiddleware>} middlewares A map containing all the middlewares function to execute whenever a client connect the server.
 * @property {Set<string>} channels A set containing all the supported channel, if empty, any channel will be allowed.
 * @property {boolean} [strictOriginCheck=false] If set to "true" client origin is required to be declared in the allowed origin list.
 * @property {boolean} [allowAnonymousOrigin=false] If set to "true" it means that clients without an origin defined in their HTTP headers will be allowed as well.
 * @property {boolean} [followHeartbeat=true] If set to "true", client connections will be periodically pinged in order to detect if they are still connected or not.
 * @property {boolean} [disconnectDeadConnections=false] If set to "true", dead connections will be automatically disconnected, this require "followHeartbeat" to be enabled.
 * @property {number} [heartbeatInterval=3000] An integer number greater than zero representing the amount of time between each heartbeat packet sent (in milliseconds).
 * @property {number} [heartbeatTimeout=3000] An integer number greater than zero representing the amount of time heartbeat response should be waited for (in milliseconds).
 */

/**
 * Processes protocol upgrade requests from WebSocket clients.
 */
class WSConnectionProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {WSConnectionProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            allowedOrigins: new Set(),
            deniedOrigins: new Set(),
            middlewares: new Map(),
            channels: new Set(),
            strictOriginCheck: false,
            allowAnonymousOrigin: false,
            followHeartbeat: true,
            disconnectDeadConnections: false,
            heartbeatInterval: 3000,
            heartbeatTimeout: 3000
        };
    }

    /**
     * Executes all the middlewares that have been defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
     *
     * @returns {Promise<boolean>} If the whole middleware chain gets executed will be returned "true", if it gets interrupted by some middleware will be returned "false".
     *
     * @async
     * @protected
     */
    async _runMiddlewares(request, socket){
        let result = true;
        const functions = Array.from(this._middlewares.values());
        const length = functions.length;
        if ( length !== 0 ){
            let pointer = 0;
            // Prepare the function that allow other middlewares to be executed is current request should continue.
            const next = async () => {
                pointer++;
                // Pick the first next function available.
                while ( pointer < length && typeof functions[pointer] !== 'function' ){
                    pointer++;
                }
                if ( pointer < length ){
                    await functions[pointer](request, socket, next);
                }
            };
            // Get the first available function.
            while ( pointer < length && typeof functions[pointer] !== 'function' ){
                pointer++;
            }
            if ( pointer < length ){
                await functions[pointer](request, socket, next);
            }
            result = length <= pointer;
        }
        return result;
    }

    /**
     * Completes the connection upgrade request issued by current client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
     * @param {Buffer} head The first packet of the upgraded stream.
     *
     * @returns {Promise<WebSocket>} An instance of the class "WebSocket" representing the WebSocket client generated after connection upgrade.
     *
     * @async
     * @protected
     */
    _completeConnectionUpgrade(request, socket, head){
        return new Promise((resolve) => {
            request.WSServer.handleUpgrade(request, socket, head, (connection) => {
                // Attach client properties.
                connection.origin = request.origin;
                connection.channel = request.channel;
                connection.server = request.server;
                // Generate an unique ID for this client.
                connection.id = generateUUID(4, false);
                // Attach properties used internally by the server.
                connection.indexedProperties = {};
                connection.properties = {};
                this._appendReadOnlyProperties(connection);
                // Setup connection status monitoring.
                this._setupHeartbeatMonitoring(connection);
                resolve(connection);
            });
        });
    }

    /**
     * Append some built-in properties that cannot be altered by the user, except for the "tags" content.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" representing the WebSocket client generated right after the HTTP connection upgrade.
     *
     * @protected
     */
    _appendReadOnlyProperties(connection){
        Object.defineProperties(connection.indexedProperties, {
            tags: {
                value: new Set(),
                writable: false,
                configurable: false,
                enumerable: true
            },
            channel: {
                value: connection.channel,
                writable: false,
                configurable: false,
                enumerable: true
            },
            id2: {
                value: connection.id,
                writable: false,
                configurable: false,
                enumerable: true
            }
        });
    }

    /**
     * Sets up connection status monitoring by sending ping messages periodically in order to detect if it is still alive or not.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" representing the WebSocket client to setup.
     *
     * @protected
     */
    _setupHeartbeatMonitoring(connection){
        // Prepare properties.
        connection.isAlive = true;
        connection.heartbeatCheckTimeout = null;
        // Bind the ping response event.
        connection.on('ping', () => {
            connection.isAlive = true;
            if ( connection.hasOwnProperty('heartbeatCheckTimeout') && connection.heartbeatCheckTimeout !== null ){
                // Prevent termination function to be executed.
                clearTimeout(connection.heartbeatCheckTimeout);
            }
            connection.emit('heartbeat.received');
        });
        if ( this._followHeartbeat === true ){
            // If heartbeat tracking is enabled, setup the monitor function interval.
            setInterval(() => {
                // Send the ping message.
                connection.ping(null, null, () => {
                    connection.isAlive = false;
                });
                // Setup the function that will handle connection termination if no response is received.
                connection.heartbeatCheckTimeout = setTimeout(() => {
                    if ( this._disconnectDeadConnections === true && connection.isAlive === false ){
                        // Disconnect current client.
                        connection.terminate();
                    }
                    connection.emit('dead');
                }, this._heartbeatTimeout);
                connection.emit('heartbeat.check');
            }, this._heartbeatInterval);
        }
    }

    /**
     * The class constructor.
     *
     * @param {?WSConnectionProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Set<string>} _allowedOrigins A set containing all the domain clients can connect from, this will override denied origins.
         *
         * @protected
         */
        this._allowedOrigins = new Set();

        /**
         * @type {Set<string>} _deniedOrigins A set containing all the domain clients cannot connect from.
         *
         * @protected
         */
        this._deniedOrigins = new Set();

        /**
         * @type {Map<string, WSConnectionMiddleware>} _middlewares A map containing all the middlewares function to execute whenever a client connect the server.
         *
         * @protected
         */
        this._middlewares = new Map();

        /**
         * @type {Set<string>} _channels A set containing all the supported channel, if empty, any channel will be allowed.
         *
         * @protected
         */
        this._channels = new Set();

        /**
         * @type {boolean} [_strictOriginCheck=false] If set to "true" client origin is required to be declared in the allowed origin list.
         *
         * @protected
         */
        this._strictOriginCheck = false;

        /**
         * @type {boolean} [_allowAnonymousOrigin=false] If set to "true" it means that clients without an origin defined in their HTTP headers will be allowed as well.
         *
         * @protected
         */
        this._allowAnonymousOrigin = false;

        /**
         * @type {boolean} [_followHeartbeat=true] If set to "true", client connections will be periodically pinged in order to detect if they are still connected or not.
         *
         * @protected
         */
        this._followHeartbeat = true;

        /**
         * @type {boolean} [_disconnectDeadConnections=false] If set to "true", dead connections will be automatically disconnected, this require "followHeartbeat" to be enabled.
         *
         * @protected
         */
        this._disconnectDeadConnections = false;

        /**
         * @type {number} [_heartbeatTimeout=3000] An integer number greater than zero representing the amount of time between each heartbeat packet sent (in milliseconds).
         *
         * @protected
         */
        this._heartbeatTimeout = 3000;

        /**
         * @type {number} [_heartbeatInterval=3000] An integer number greater than zero representing the amount of time heartbeat response should be waited for (in milliseconds).
         *
         * @protected
         */
        this._heartbeatInterval = 3000;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {WSConnectionProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {WSConnectionProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('allowedOrigins') && configuration.allowedOrigins instanceof Set ){
            this._allowedOrigins = configuration.allowedOrigins;
        }
        if ( configuration.hasOwnProperty('deniedOrigins') && configuration.deniedOrigins instanceof Set ){
            this._deniedOrigins = configuration.deniedOrigins;
        }
        if ( configuration.hasOwnProperty('middlewares') && configuration.middlewares instanceof Map ){
            this._middlewares = configuration.middlewares;
        }
        if ( configuration.hasOwnProperty('channels') && configuration.channels instanceof Set ){
            this._channels = configuration.channels;
        }
        if ( configuration.hasOwnProperty('strictOriginCheck') ){
            this._strictOriginCheck = configuration.strictOriginCheck === true;
        }
        if ( configuration.hasOwnProperty('allowAnonymousOrigin') ){
            this._allowAnonymousOrigin = configuration.allowAnonymousOrigin === true;
        }
        if ( configuration.hasOwnProperty('followHeartbeat') ){
            this._followHeartbeat = configuration.followHeartbeat !== false;
        }
        if ( configuration.hasOwnProperty('disconnectDeadConnections') ){
            this._disconnectDeadConnections = configuration.disconnectDeadConnections === true;
        }
        if ( configuration.hasOwnProperty('heartbeatTimeout') && configuration.heartbeatTimeout !== null && !isNaN(configuration.heartbeatTimeout) && configuration.heartbeatTimeout > 0 ){
            this._heartbeatTimeout = configuration.heartbeatTimeout;
        }
        if ( configuration.hasOwnProperty('heartbeatInterval') && configuration.heartbeatInterval !== null && !isNaN(configuration.heartbeatInterval) && configuration.heartbeatInterval > 0 ){
            this._heartbeatInterval = configuration.heartbeatInterval;
        }
        return this;
    }

    /**
     * Processes the given HTTP request in order to upgrade the request protocol from HTTP to WebSocket.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
     * @param {Buffer} head The first packet of the upgraded stream.
     *
     * @returns {Promise<?WebSocket>} An instance of the class "WebSocket" representing the WebSocket client generated after connection upgrade or null if conneciton cannot be upgraded.
     *
     * @throws {UpgradeRejectedHTTPException} If anonymous origins are not allowed and the client didn't provide any one.
     * @throws {UpgradeRejectedHTTPException} If client provided origin is not allowed according to current settings.
     * @throws {NotFoundHTTPException} If client provided channel is not accepted according to current settings.
     * @throws {UpgradeRejectedHTTPException} If upgrade request gets rejected by middlewares.
     *
     * @async
     */
    async process(request, socket, head){
        let connection = null;
        if ( request.hasOwnProperty('WSServer') && request.WSServer instanceof Server ){
            request.origin = request.headers.hasOwnProperty('origin') ? request.headers.origin.toLowerCase() : '';
            // Check if client origin is allowed.
            if ( request.origin === '' && this._allowAnonymousOrigin === false ){
                throw new UpgradeRejectedHTTPException('Anonymous origins not allowed.', 1);
            }
            if ( !this._allowedOrigins.has(request.origin) && this._strictOriginCheck === true && !this._deniedOrigins.has(request.origin) ){
                throw new UpgradeRejectedHTTPException('Origin not allowed.', 2);
            }
            // Check if client provided channel is allowed.
            request.channel = typeof request.url !== 'string' || request.url === '' ? '/' : ( request.url === '/' ? request.url : request.url.substr(1) );
            if ( this._channels.size > 0 && !this._channels.has(request.channel) ){
                throw new NotFoundHTTPException('Channel not found.', 3);
            }
            request.server = request.hasOwnProperty('server') ? request.server : null;
            // Run middlewares defined in order to check if current upgrade request is valid.
            const allowed = await this._runMiddlewares(request, socket);
            if ( !allowed ){
                throw new UpgradeRejectedHTTPException('Upgrade rejected by middlewares.', 4);
            }
            // Complete the protocol upgrade request and generate the WebSocket client object.
            connection = await this._completeConnectionUpgrade(request, socket, head);
        }
        return connection;
    }
}

module.exports = WSConnectionProcessor;
