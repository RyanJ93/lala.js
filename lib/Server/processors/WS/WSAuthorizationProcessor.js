'use strict';

// Including Lala's modules.
const Processor = require('../Processor');
const {
    UnauthorizedHTTPException
} = require('../../../Exceptions');

/**
 * @callback WSAuthenticationCallback The callback function that is invoked whenever a new client connects the WebSocket server.
 *
 * @param {WebSocket} connection An instance of the class "WebSocket" provided by the third part module "ws" used to represent a WebSocket client connection.
 *
 * @returns {Promise<boolean>} If the client can connect the server should be returned "true", otherwise "false" or an exception should be thrown.
 *
 * @async
 */

/**
 * @typedef {Object} WSAuthorizationProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, WSAuthenticationCallback>} callbacks A map containing all the callbacks to invoke in order to establish if a client can connect the server or not and containing as key the channel name and as value the callback function.
 */

/**
 * Allows to implements an authentication layer on top of WebSocket connections.
 */
class WSAuthorizationProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {WSAuthorizationProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            callbacks: new Map()
        };
    }

    /**
     * Returns the callback function to trigger based on the given connection's channel.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the third part module "ws" used to represent a WebSocket client connection.
     *
     * @returns {?WSAuthenticationCallback} The callback function or null if no suitable function has been found according to the given connection.
     *
     * @protected
     */
    _getCallback(connection){
        const channel = connection.hasOwnProperty('channel') ? connection.channel : '/';
        // Check if a function has been defined for the channel this connection is connected to.
        let callback = this._callbacks.get(channel);
        if ( typeof callback !== 'function' ){
            // If no function has been found, look up the default one.
            callback = this._callbacks.get('*');
        }
        return typeof callback !== 'function' ? null : callback;
    }

    /**
     * The class constructor.
     *
     * @param {?WSAuthorizationProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, WSAuthenticationCallback>} _callbacks A map containing all the callbacks to invoke in order to establish if a client can connect the server or not and containing as key the channel name and as value the callback function.
         *
         * @protected
         */
        this._callbacks = new Map();

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {WSAuthorizationProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {WSAuthorizationProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('callbacks') && configuration.callbacks instanceof Map ){
            this._callbacks = configuration.callbacks;
        }
        return this;
    }

    /**
     * Executes the authentication function defined in order to find out if given client can connect the server or not.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @returns {Promise<void>}
     *
     * @throws {UnauthorizedHTTPException} If authentication fails.
     *
     * @async
     */
    async process(connection){
        // Get the callback function that implements the authentication mechanism.
        const callback = this._getCallback(connection);
        if ( callback !== null ){
            // Execute the callback function found in order to find out if this client can connect the server or not.
            const allowed = await callback(connection);
            if ( allowed !== true ){
                // Client connection request has been rejected.
                throw new UnauthorizedHTTPException('Connection request rejected.', 1);
            }
        }
    }
}

module.exports = WSAuthorizationProcessor;
