'use strict';

// Including third part modules.
const WebSocket = require('ws');

// Including Lala's modules.
const Processor = require('../Processor');
const BufferSerializer = require('../../../Support/BufferSerializer');
const MessageProtocol = require('../../MessageProtocol');
const {
    InvalidArgumentException,
    BadMethodCallException
} = require('../../../Exceptions');

/**
 * @typedef {Object} WSOutputProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {?MessageProtocol} messageProtocol The class to use to encode messages content.
 */

/**
 * Allow to process and serialize messages that are going to be sent to WebSocket clients.
 */
class WSOutputProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {WSOutputProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            messageProtocol: null
        };
    }

    /**
     * Encodes a message according to the protocol defined, if defined.
     *
     * @param {*} message The message to encode before being sent to the client.
     *
     * @returns {*} The encoded message.
     *
     * @protected
     */
    _wrapMessage(message){
        if ( this._messageProtocol !== null ){
            // Get an instance of the class that implements the protocol.
            const protocol = new this._messageProtocol();
            message = protocol.wrap(message);
        }
        return message;
    }

    /**
     * The class constructor.
     *
     * @param {?WSOutputProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {?MessageProtocol} [_messageProtocol] The class to use to encode messages content.
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
     * @param {WSOutputProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {WSOutputProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration) {
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('messageProtocol') && ( configuration.messageProtocol === null || ( typeof configuration.messageProtocol === 'function' && MessageProtocol.isPrototypeOf(configuration.messageProtocol) ) ) ){
            this._messageProtocol = configuration.messageProtocol;
        }
        return this;
    }

    /**
     * Processes the output that will be sent to the WebSocket clients as a message, then sends it to the given client.
     *
     * @param {*} message The message content, usually a string.
     * @param {WebSocket} client An instance of the class "WebSocket" provided by the third part module "ws" used to represent a WebSocket client connection.
     * @param {?WSMessageOptions} [options] An object containing some additional settings to consider when sending the message.
     *
     * @returns {Promise<void>}
     *
     * @throws {BadMethodCallException} If the given client's connection is not open.
     *
     * @async
     */
    async process(message, client, options = null){
        if ( client.readyState !== WebSocket.OPEN ){
            throw new BadMethodCallException('This client connection is not open.', 1);
        }
        // Encode the message according to the protocol defined.
        message = this._wrapMessage(message);
        // Serialize the message to a standard buffer.
        const serializer = new BufferSerializer();
        let output = await serializer.setCallbackParameters([message, client]).serialize(message);
        await (new Promise((resolve) => {
            // Get the function to use for sending, if defined, "rawSend" will represent a copy of the original send function, then it doesn't contain any other layer added by this framework.
            const sender = client.hasOwnProperty('rawSend') && typeof client.rawSend === 'function' ? client.rawSend : client.send;
            sender(output, Object.assign({
                binary: false
            }, options), () => {
                resolve();
            });
        }));
    }
}

module.exports = WSOutputProcessor;
