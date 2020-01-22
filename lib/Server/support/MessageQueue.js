'use strict';

// Including third part modules.
const WebSocket = require('ws');

// Including Lala's modules.
const {
    InvalidArgumentException,
} = require('../../Exceptions');

/**
 * @typedef {Object} QueuedMessage An object representing a message that should be kept apart while waiting to be sent in future.
 *
 * @property {*} message The message that will be sent.
 * @property {Date} date An instance of the class "Date" representing the date when the message has been pushed to the queue.
 * @property {?WSMessageOptions} messageOptions An object containing some additional options to consider during data sending.
 */

/**
 * @typedef {Object} MessageQueueNode An object representing a single node in the tree hierarchy used to store queued messages indexed by some properties.
 *
 * @property {QueuedMessage[]} messages An array containing all the messages queued for this node.
 * @property {?Map<string, MessageQueueNode>} next A map containing all the nodes dependents by this hierarchy level.
 */

/**
 * Represents a queue of messages to be sent later to clients.
 */
class MessageQueue {
    /**
     * Extracts all the indexing keys from a given arbitrary object.
     *
     * @param {Object.<string, *>} properties An object containing the properties to use as indexing keys.
     *
     * @returns {string[]} An array containing all the indexing keys as strings.
     *
     * @protected
     */
    static _extractKeys(properties){
        const keys = [];
        if ( properties !== null && typeof properties === 'object' ){
            for ( const key in properties ){
                if ( properties.hasOwnProperty(key) ){
                    if ( properties[key] instanceof Set ){
                        // Generate a key for each collection value.
                        const wholeCollection = [];
                        for ( const entry of properties[key] ){
                            keys.push(key + ':' + entry);
                            wholeCollection.push(entry);
                        }
                        // Generate a key based on the whole collection.
                        keys.push(key + ':' + wholeCollection.join(','));
                    }else if ( Array.isArray(properties[key]) ){
                        const length = properties[key].length;
                        for ( let i = 0 ; i < length ; i++ ){
                            keys.push(key + ':' + properties[key][i]);
                        }
                        keys.push(key + ':' + properties[key].join(','));
                    }else{
                        // Ensure the entry value to be a string.
                        const value = typeof properties[key] === 'string' ? properties[key] : properties[key].toString();
                        // Generate the indexing key for current entry.
                        keys.push(key + ':' + value);
                    }
                }
            }
        }
        // Same properties in different declaration order should lead to the same standardized result.
        keys.sort();
        if ( keys.length === 0 ){
            throw new InvalidArgumentException('Invalid properties.', 1);
        }
        return keys;
    }

    /**
     * Sends all the given messages to the given connection.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     * @param {QueuedMessage[]} messages An array containing the messages to send represented as objects.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    static async _sendMessages(connection, messages){
        const processes = [];
        // Send messages one by one in parallel way.
        for ( const message of messages ){
            processes.push(connection.send(message.message, message.messageOptions));
        }
        await Promise.all(processes);
    }

    /**
     * Extract all the messages from a given node based on a given array of keys.
     *
     * @param {string[]} keys An array of string containing the keys that should be find in the given tree.
     * @param {number} length An integer number greater than zero representing the number of keys given.
     * @param {Map<string, MessageQueueNode>} tree The tree where messages will be extracted from.
     * @param {boolean} drop If set to "true" messages will be removed once extracted from the final node.
     *
     * @returns {QueuedMessage[]} An array containing the messages found represented as objects.
     *
     * @protected
     */
    static _extractMessagesFromNode(keys, length, tree, drop){
        let messages = [];
        for ( let i = 0 ; i < length ; i++ ){
            if ( tree.has(keys[i]) ){
                const node = tree.get(keys[i]);
                if ( node.next !== null ){
                    // The node matching node is part of current node's hierarchy, process it.
                    const results = MessageQueue._extractMessagesFromNode(keys, length, node.next, drop);
                    if ( results.length > 0 ){
                        messages = messages.concat(results);
                    }
                }else{
                    // This is the node that matches given properties, extract messages from it.
                    messages = messages.concat(node.messages);
                    if ( drop === true ){
                        // If the "drop" option has been set to "true", then remove this node's queued messages.
                        node.messages = [];
                    }
                }
            }
        }
        return messages;
    }

    /**
     * Gets a node based on the given properties.
     *
     * @param {Object.<string, *>} properties An object containing the properties to use to look up the node within the hierarchy.
     *
     * @returns {?MessageQueueNode} An object representing the matching node.
     *
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     *
     * @protected
     */
    _getNodeByProperties(properties){
        // Gets identifiers from given properties.
        const keys = MessageQueue._extractKeys(properties);
        const length = keys.length;
        let current = this._queue.get(keys[0]), i = 1;
        // Loop for each identifier in order to dig deep into the tree hierarchy.
        while ( i < length && typeof current !== 'undefined' ){
            current = current.next === null ? undefined : current.next.get(keys[i]);
            i++;
        }
        return typeof current === 'undefined' ? null : current;
    }

    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {Map<string, MessageQueueNode>} _queue Contains the whole tree hierarchy where queued messages are stored in according to some custom properties given as key/value pairs.
         *
         * @protected
         */
        this._queue = new Map();
    }

    /**
     * Pushes a message to the queue of the messages to send, this method is chainable.
     *
     * @param {Object.<string, *>} properties An object containing the properties to use as indexing keys.
     * @param {*} message The message that will be sent.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider during data sending.
     *
     * @returns {MessageQueue}
     *
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     */
    push(properties, message, options = null){
        if ( options !== null && typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 2);
        }
        // Extract the indexing keys from the given properties.
        const keys = MessageQueue._extractKeys(properties);
        const length = keys.length;
        let i = 1;
        // Extract first node from the tree.
        let current = this._queue.get(keys[0]);
        if ( typeof current === 'undefined' ){
            // If no node corresponding to the first attribute is found create it, then add it to the tree.
            const node = {
                messages: [],
                next: null
            };
            this._queue.set(keys[0], node);
            current = node;
        }
        // Loop until last node is reached in the tree hierarchy, each property pair represents a node, start from the second one.
        while ( i < length ){
            if ( current.next === null ){
                current.next = new Map();
            }
            let next = current.next.get(keys[i]);
            if ( typeof next === 'undefined' ){
                // As before, if next tree node is not found, then create it.
                next = {
                    messages: [],
                    next: null
                };
                current.next.set(keys[i], next);
            }
            current = next;
            i++;
        }
        // Once obtained last tree node according to given properties, then append the given message to its queue.
        current.messages.push({
            date: new Date(),
            message: message,
            messageOptions: options
        });
        return this;
    }

    /**
     * Returns all the messages that have been pushed to the queue for the given properties.
     *
     * @param {Object.<string, *>} properties An object containing the properties messages have been indexed by.
     * @param {boolean} [drop=false] If set to "true", the message queue found is destroyed after being returned.
     *
     * @returns {QueuedMessage[]} An array containing the messages as objects.
     *
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     */
    get(properties, drop = false){
        // Extract the node from the tree hierarchy the node according to given properties.
        const node = this._getNodeByProperties(properties);
        let messages = [];
        if ( node !== null ){
            messages = node.messages;
            if ( drop === true ){
                // If the "drop" option has been set to "true", then remove this node's queued messages.
                node.messages = [];
            }
        }
        return messages;
    }

    /**
     * Returns all the messages that have been pushed to the queue
     *
     * @param {Object.<string, *>} properties An object containing the properties messages have been indexed by.
     * @param {boolean} [drop=false] If set to "true", the message queue found is destroyed after being returned.
     *
     * @returns {QueuedMessage[]} An array containing the messages as objects.
     *
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     */
    getAll(properties, drop = false){
        // Gets identifiers from given properties.
        const keys = MessageQueue._extractKeys(properties);
        const length = keys.length;
        // Extract the messages
        return MessageQueue._extractMessagesFromNode(keys, length, this._queue, drop);
    }

    /**
     * Drops all the messages that have been pushed to the queue for the given properties, this method is chainable.
     *
     * @param {Object.<string, *>} properties An object containing the properties messages have been indexed by.
     *
     * @returns {MessageQueue}
     *
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     */
    drop(properties){
        // Extract the node from the tree hierarchy the node according to given properties.
        const node = this._getNodeByProperties(properties);
        if ( node !== null ){
            node.messages = [];
        }
        return this;
    }

    /**
     * Removes all the messages from any queue, this method is chainable.
     *
     * @returns {MessageQueue}
     */
    clear(){
        this._queue.clear();
        return this;
    }

    /**
     * Sends all the messages that have been pushed to the queue for the given properties to a given client.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     * @param {Object.<string, *>} properties An object containing the properties messages have been indexed by.
     * @param {boolean} [drop=true] If set to "true" all the messages contained in the queue will be removed once sent, by default they're dropped automatically.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid connection object is given.
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     *
     * @async
     */
    async send(connection, properties, drop = true){
        if ( !( connection instanceof WebSocket ) ){
            throw new InvalidArgumentException('Invalid connection object.', 1);
        }
        // Get all the queued messages based on the given attribute name and value.
        const messages = this.getAll(properties, drop);
        if ( messages.length > 0 ){
            await MessageQueue._sendMessages(connection, messages);
        }
    }
}

module.exports = MessageQueue;
