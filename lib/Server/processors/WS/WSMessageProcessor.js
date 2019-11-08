'use strict';

// Including Lala's modules.
const Processor = require('../Processor');
const WebSocketMessage = require('../../../Types/WebSocketMessage');
const MessageProtocol = require('../../MessageProtocol');
const {
    MessageRejectedWebSocketException
} = require('../../../Exceptions');

/**
 * @callback WSMessageControllerCallback The callback function that is invoked whenever a WebSocket message is processed.
 *
 * @param {WebSocketMessage} message An instance of the class "WebSocketMessage" representing the message received by the websocket server.
 *
 * @returns {Promise<*>} Some data to send back to the client as a message reply.
 *
 * @async
 */

/**
 * @callback WSMessageMiddlewareHandler The callback function that implements the middleware behaviour.
 *
 * @param {WebSocketMessage} message An instance of the class "WebSocketMessage" representing the message received by the websocket server.
 * @param {function} next The callback function to invoke in order to keep the middleware chain running, if not invoked client message will be rejected.
 *
 * @returns {Promise<void>}
 *
 * @async
 */

/**
 * @typedef {Object} WSMessageProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, WSMessageMiddlewareHandler>} middlewares A map containing the middlewares to execute before processing received messages and having as key the unique name assigned to the middleware and as value the callback function to invoke.
 * @property {Map<string, WSMessageControllerCallback>} controllers A map containing the callback function used to handle client message having as key the name of the channel it should be used for.
 * @property {?MessageProtocol} messageProtocol The class to use to decode messages content.
 */

/**
 * Processes messages sent by clients through the WebSocket protocol.
 */
class WSMessageProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {WSMessageProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            middlewares: new Map(),
            controllers: new Map(),
            messageProtocol: null
        };
    }

    /**
     * Returns the callback function to trigger based on the given connection's channel.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the third part module "ws" used to represent a WebSocket client connection.
     *
     * @returns {?WSMessageControllerCallback} The callback function or null if no suitable function has been found according to the given connection.
     *
     * @protected
     */
    _getController(connection){
        const channel = connection.hasOwnProperty('channel') ? connection.channel : '/';
        // Check if a controller function has been defined for the channel this connection is connected to.
        let controller = this._controllers.get(channel);
        if ( typeof controller !== 'function' ){
            // If no controller function has been found, look up the default one.
            controller = this._controllers.get('*');
        }
        return typeof controller !== 'function' ? null : controller;
    }

    /**
     * Executes all the middlewares that have been defined.
     *
     * @param {WebSocketMessage} message An instance of the class "WebSocketMessage" representing the message received by the websocket server.
     *
     * @returns {Promise<boolean>} If the whole middleware chain gets executed will be returned "true", if it gets interrupted by some middleware will be returned "false".
     *
     * @async
     * @protected
     */
    async _runMiddlewares(message){
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
                    await functions[pointer](message, next);
                }
            };
            // Get the first available function.
            while ( pointer < length && typeof functions[pointer] !== 'function' ){
                pointer++;
            }
            if ( pointer < length ){
                await functions[pointer](message, next);
            }
            result = length <= pointer;
        }
        return result;
    }

    /**
     * Decodes the received message according to the protocol defined, if defined.
     *
     * @param {string} content A string containing the message received from the client.
     *
     * @returns {*} The decoded message.
     *
     * @protected
     */
    _unwrapMessage(content){
        if ( this._messageProtocol !== null ){
            // Get an instance of the class that implements the protocol.
            const protocol = new this._messageProtocol();
            content = protocol.unwrap(content);
        }
        return content;
    }

    /**
     * The class constructor.
     *
     * @param {?WSMessageProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, WSMessageMiddlewareHandler>} _middlewares A map containing the middlewares to execute before processing received messages and having as key the unique name assigned to the middleware and as value the callback function to invoke.
         *
         * @protected
         */
        this._middlewares = new Map();

        /**
         * @type {Map<string, WSMessageControllerCallback>} _controllers A map containing the callback function used to handle client message having as key the name of the channel it should be used for.
         *
         * @protected
         */
        this._controllers = new Map();

        /**
         * @type {?MessageProtocol} [_messageProtocol] The class to use to decode messages content.
         *
         * @protected
         */
        this._messageProtocol = null;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {WSMessageProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {WSMessageProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('middlewares') && configuration.middlewares instanceof Map ){
            this._middlewares = configuration.middlewares;
        }
        if ( configuration.hasOwnProperty('controllers') && configuration.controllers instanceof Map ){
            this._controllers = configuration.controllers;
        }
        if ( configuration.hasOwnProperty('messageProtocol') && ( configuration.messageProtocol === null || ( typeof configuration.messageProtocol === 'function' && MessageProtocol.isPrototypeOf(configuration.messageProtocol) ) ) ){
            this._messageProtocol = configuration.messageProtocol;
        }
        return this;
    }

    /**
     * Processes the given message.
     *
     * @param {*} content The received message, usually a string.
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the third part module "ws" used to represent a WebSocket client connection.
     *
     * @returns {Promise<void>}
     *
     * @throws {MessageRejectedWebSocketException} If given message gets rejected by middlewares defined.
     *
     * @async
     */
    async process(content, connection){
        if ( connection.hasOwnProperty('server') ){
            // Decode the received message according to the protocol defined.
            content = this._unwrapMessage(content);
            // Generate the object that wraps the received message.
            const message = new WebSocketMessage(content, connection, connection.server);
            // Executed the middlewares that have been defined in order to find out if this message should be processed.
            const allowed = await this._runMiddlewares(message);
            if ( !allowed ){
                throw new MessageRejectedWebSocketException('This message has been rejected by middlewares.', 1);
            }
            // Get the controller callback function to invoke.
            const controller = this._getController(connection);
            if ( controller !== null ){
                const ret = await controller(message);
                if ( ret !== null && typeof ret !== 'undefined' ){
                    await message.reply(ret);
                }
            }
        }
    }
}

module.exports = WSMessageProcessor;
