'use strict';

// Including third part modules.
const WebSocket = require('ws');

// Including Lala's modules.
const { generateUUID } = require('../Helpers/helpers/BuiltInHelpers');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents a single message sent over the WebSocket protocol.
 */
class WebSocketMessage {
    /**
     * The class constructor.
     *
     * @param {*} message The message received from the client.
     * @param {WebSocket} sender An instance of the "WebSocket" class from the "ws" module representing a client connected to the WebSocket server that received this message.
     * @param {WSServer} server An instance of the class that implements the WebSocket server, it must extend the "WSServer" class.
     */
    constructor(message, sender, server){
        if ( typeof message !== 'string' ){
            throw new InvalidArgumentException('Invalid message.', 1);
        }
        if ( !( sender instanceof WebSocket ) ){
            throw new InvalidArgumentException('Invalid sender.', 1);
        }

        /**
         * @type {*} _message The message received from the client.
         *
         * @protected
         */
        this._message = message;

        /**
         * @type {WebSocket} _sender An instance of the class "WebSocket" provided by the third part module that implements the WebSocket protocol and representing a client connection.
         *
         * @protected
         */
        this._sender = sender;

        /**
         * @type {WSServer} _server An instance of the class "WSServer" representing the server that received this message.
         *
         * @protected
         */
        this._server = server;

        /**
         * @type {string} _id A string containing an unique ID assigned to this message (a string representation of an UUID version 4).
         *
         * @protected
         */
        this._id = generateUUID(4, false);
    }

    /**
     * Returns the message that has been received.
     *
     * @returns {*} The message received from the client.
     */
    getMessage(){
        return this._message;
    }

    /**
     * Returns the client that has sent this message.
     *
     * @returns {WebSocket} An instance of the class "WebSocket" provided by the third part module that implements the WebSocket protocol and representing a client connection.
     */
    getSender(){
        return this._sender;
    }

    /**
     * Returns the server that has received this message.
     *
     * @returns {WSServer} An instance of the class "WSServer" representing the server.
     */
    getServer(){
        return this._server;
    }

    /**
     * Returns the unique ID that has been assigned to this message.
     *
     * @returns {string} A string representation of the message ID, an UUID version 4.
     */
    getID(){
        return this._id;
    }

    /**
     * Sends a message back to the client that has sent this one.
     *
     * @param {*} message THe message to send.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid object containing the message options is given.
     *
     * @async
     */
    reply(message, options = null){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options object.', 1);
        }
        return new Promise((resolve) => {
            this._sender.send(message, options, () => {
                resolve();
            });
        });
    }

    /**
     * Replies to all the clients connected to the same channel.
     * 
     * @param {*} message THe message to send.
     * @param {?string[]} [tags] An optional array containing all the tags clients should match as strings.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid tags array is given.
     * @throws {InvalidArgumentException} If an invalid object containing the message options is given.
     *
     * @async
     */
    async replyToChannel(message, tags = null, options = null){
        if ( tags !== null && !Array.isArray(tags) ){
            throw new InvalidArgumentException('Invalid tags array.', 1);
        }
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options object.', 2);
        }
        const processes = [];
        // get all the clients matching the given parameters.
        const clients = this._server.getClients(this._sender.channel, tags);
        for ( const client of clients ){
            if ( client.readyState === WebSocket.OPEN && client.id !== this._sender.id ){
                // Send the message if current connection is open and if it doesn't match with the sender.
                processes.push(new Promise((resolve) => {
                    client.send(message, options, () => {
                        resolve();
                    });
                }));
            }
        }
        await Promise.all(processes);
    }

    /**
     * Sends a message to all the clients that matches some given filters.
     *
     * @param {*} message The message to send.
     * @param {?string} [channel] A string containing the channel name or null if the message should be sent to any channel.
     * @param {?string[]} [tags] An array containing all the tags clients should match as strings.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid channel is given.
     * @throws {InvalidArgumentException} If an invalid tags array is given.
     * @throws {InvalidArgumentException} If an invalid object containing the message options is given.
     *
     * @async
     */
    async replyToOthers(message, channel = null, tags = null, options = null){
        if ( channel !== null && ( channel === '' || typeof channel !== 'string' ) ){
            throw new InvalidArgumentException('Invalid channel.', 1);
        }
        if ( tags !== null && !Array.isArray(tags) ){
            throw new InvalidArgumentException('Invalid tags array.', 2);
        }
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options object.', 3);
        }
        const processes = [];
        // get all the clients matching the given parameters.
        const clients = this._server.getClients(this._sender.channel, tags);
        for ( const client of clients ){
            if ( client.readyState === ws.OPEN && client.id !== this._sender.id ){
                // Send the message if current connection is open and if it doesn't match with the sender.
                processes.push(new Promise((resolve) => {
                    client.send(message, options, () => {
                        resolve();
                    });
                }));
            }
        }
        await Promise.all(processes);
    }

    /**
     * Forwards current message to all the clients connected to the same channel.
     *
     * @param {?string[]} tags Some additional tags that target clients must be tagged by.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider during data sending.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid tags array is given.
     * @throws {InvalidArgumentException} If an invalid object containing the message options is given.
     *
     * @async
     */
    forwardToChannel(tags = null, options = null){
        return this.replyToChannel(this._message, tags, options);
    }

    /**
     * Forwards current message to all the clients that matches some given filters.
     *
     * @param {?string} [channel] A string containing the channel name or null if the message should be sent to any channel.
     * @param {?string[]} [tags] An array containing all the tags clients should match as strings.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid channel is given.
     * @throws {InvalidArgumentException} If an invalid tags array is given.
     * @throws {InvalidArgumentException} If an invalid object containing the message options is given.
     *
     * @async
     */
    forwardToOthers(channel = null, tags = null, options = null){
        return this.replyToOthers(this._message, channel, tags, options);
    }
}

module.exports = WebSocketMessage;
