'use strict';

// Including Lala's modules.
const HelperRepository = require('../../Helpers/HelperRepository');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @typedef {Object} WSServerHelperConnectionContext An object containing the context variables required by helper functions.
 *
 * @property {WebSocket} connection An instance of the class "WebSocket" representing a WebSocket client connected to the server.
 */

/**
 * Adds a tag to the WebSocket connection.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} tag A string representing the tag to add.
 *
 * @returns {WebSocket}
 * 
 * @throws {InvalidArgumentException} If an invalid tag is given.
 */
function addTag(context, tag){
    if ( tag === '' || typeof tag !== 'string' ){
        throw new InvalidArgumentException('Invalid tag.', 1);
    }
    context.connection.indexedProperties.tags.add(tag);
    this._WSConnectionsIndex.index(context.connection, null, 'indexedProperties');
    return context.connection;
}

/**
 * Adds multiple tags to the WebSocket connection.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string[]} tags An array of strings containing the tags to add.
 * 
 * @returns {WebSocket}
 * 
 * @throws {InvalidArgumentException} If an invalid array of tags is given.
 */
function addTags(context, tags){
    if ( !Array.isArray(tags) ){
        throw new InvalidArgumentException('Invalid tags.', 1);
    }
    const length = tags.length;
    for ( let i = 0 ; i < length ; i++ ){
        if ( tags[i] !== '' && typeof tags[i] === 'string' ){
            context.connection.indexedProperties.tags.add(tags[i]);
        }
    }
    this._WSConnectionsIndex.index(context.connection, null, 'indexedProperties');
    return context.connection;
}

/**
 * Removes a given tags from the tags assigned to the WebSocket connection.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} tag A string representing the tag to remove.
 * 
 * @returns {WebSocket}
 *
 * @throws {InvalidArgumentException} If an invalid tag is given.
 */
function removeTag(context, tag){
    if ( tag === '' || typeof tag !== 'string' ){
        throw new InvalidArgumentException('Invalid tag.', 1);
    }
    context.connection.indexedProperties.tags.delete(tag);
    this._WSConnectionsIndex.index(context.connection, null, 'indexedProperties');
    return context.connection;
}

/**
 * Removes multiple tags from the the tags assigned to the WebSocket connection.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string[]} tags An array of strings containing the tags to remove.
 * 
 * @returns {WebSocket}
 * 
 * @throws {InvalidArgumentException} If an invalid array of tags is given.
 */
function removeTags(context, tags){
    if ( !Array.isArray(tags) ){
        throw new InvalidArgumentException('Invalid tags.', 1);
    }
    const length = tags.length;
    for ( let i = 0 ; i < length ; i++ ){
        context.connection.indexedProperties.tags.delete(tags[i]);
    }
    this._WSConnectionsIndex.index(context.connection, null, 'indexedProperties');
    return context.connection;
}

/**
 * Adds a custom attribute to the WebSocket connection.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} name A string containing the attribute name.
 * @param {string} value A string containing the attribute value.
 * @param {boolean} [index=true] If set to "true" WebSocket connection will be indexed by this attribute allowing to send messages to all the connections having this attribute.
 * 
 * @returns {WebSocket}
 *
 * @throws {InvalidArgumentException} If an invalid attribute name is given.
 * @throws {InvalidArgumentException} If an invalid attribute value is given.
 */
function setAttribute(context, name, value, index = true){
    if ( name === '' || typeof name !== 'string' ){
        throw new InvalidArgumentException('Invalid attribute name.', 1);
    }
    if ( value === '' || typeof value !== 'string' ){
        throw new InvalidArgumentException('Invalid attribute value.', 2);
    }
    const stack = index === true ? context.connection.indexedProperties : context.connection.properties;
    stack[name] = value;
    this._sendQueuedMessages(context.connection);
    if ( index === true ){
        this._WSConnectionsIndex.index(context.connection, null, 'indexedProperties');
    }
    return context.connection;
}

/**
 * Removes an attribute from the WebSocket connection.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} name A string containing the attribute name.
 *
 * @returns {WebSocket}
 *
 * @throws {InvalidArgumentException} If an invalid attribute name is given.
 */
function removeAttribute(context, name){
    if ( name === '' || typeof name !== 'string' ){
        throw new InvalidArgumentException('Invalid attribute name.', 1);
    }
    if ( context.connection.indexedProperties.hasOwnProperty(name) ){
        delete context.connection.indexedProperties[name];
        this._WSConnectionsIndex.index(context.connection, null, 'indexedProperties');
    }else if ( context.connection.properties.hasOwnProperty(name) ){
        delete context.connection.properties[name];
    }
    return context.connection;
}

/**
 * Send a message to the WebSocket client.
 *
 * @param {WSServerHelperConnectionContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {*} message The message content, usually a string.
 * @param {?WSMessageOptions} [options] An object containing some additional settings to consider when sending the message.
 *
 * @returns {Promise<void>}
 *
 * @async
 */
async function send(context, message, options = null){
    const processor = this._WSOutputProcessorFactory.craft();
    await processor.process(message, context.connection, options);
}

module.exports.registerHelpers = () => {
    HelperRepository.register('addTag', addTag, 'com.lala.server.WSServer.connection');
    HelperRepository.register('addTags', addTags, 'com.lala.server.WSServer.connection');
    HelperRepository.register('removeTag', removeTag, 'com.lala.server.WSServer.connection');
    HelperRepository.register('removeTags', removeTags, 'com.lala.server.WSServer.connection');
    HelperRepository.register('setAttribute', setAttribute, 'com.lala.server.WSServer.connection');
    HelperRepository.register('removeAttribute', removeAttribute, 'com.lala.server.WSServer.connection');
    HelperRepository.register('send', send, 'com.lala.server.WSServer.connection');
};
