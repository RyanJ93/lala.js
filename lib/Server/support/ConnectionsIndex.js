'use strict';

// Including third part modules.
const ws = require('ws');

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Stores WebSocket connections indexed by some properties.
 */
class ConnectionsIndex {
    /**
     * Gets all the properties contained in a given connection's property.
     *
     * @param {?WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     * @param {string} container A string containing the name of the property where properties should be extracted from.
     *
     * @returns {?Object.<string, *>} An object containing the properties found or null if the given container property doesn't exist.
     *
     * @throws {InvalidArgumentException} If an invalid container property name is given.
     *
     * @protected
     */
    static _getConnectionProperties(connection, container){
        if ( container === '' || typeof container !== 'string' ){
            throw new InvalidArgumentException('Invalid container name.', 1);
        }
        return connection.hasOwnProperty(container) && typeof connection[container] === 'object' ? connection[container] : null;
    }

    /**
     *
     *
     * @param {Object.<string, *>} connectionProperties An object containing the connection's properties that have been extracted.
     * @param {?string[]} properties An array of strings containing the list of the properties connection should be indexed by.
     *
     * @returns {string[]} An array of strings containing the names of the properties connection should be indexed by.
     *
     * @throws {InvalidArgumentException} If an invalid array of property names is given.
     *
     * @protected
     */
    static _getPropertyList(connectionProperties, properties){
        if ( properties !== null && !Array.isArray(properties) ){
            throw new InvalidArgumentException('Invalid properties array.', 1);
        }
        return properties === null ? Object.keys(connectionProperties) : properties;
    }

    /**
     * Indexes the given connection according to the given property value.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     * @param {*} propertyValue The property value that will be used as indexing key.
     * @param {Map<*, Set<WebSocket>>} stack The map where the given connection must be indexed in.
     *
     * @protected
     */
    static _indexProperty(connection, propertyValue, stack){
        if ( Array.isArray(propertyValue) || propertyValue instanceof Set ){
            // Given property value is an iterable unidimensional object, index this connection by each contained value.
            for ( const value of propertyValue ){
                this._indexProperty(connection, value, stack);
            }
        }else{
            // Get the list of the connection for this property value.
            let connectionList = stack.get(propertyValue);
            if ( typeof connectionList === 'undefined' ){
                connectionList = new Set();
                stack.set(propertyValue, connectionList);
            }
            connectionList.add(connection);
        }
    }

    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {Map<string, Map<*, Set<WebSocket>>>} _index A map having as key the property name and as value another map that indexes connection using the property value(s) as key.
         *
         * @protected
         */
        this._index = new Map();

        /**
         * @type {Map<WebSocket, Map<string, *>>} _reverseIndex A map that stores properties the connection are indexed by, it contains as key the connection and as value another map that stores properties as key/value pairs.
         *
         * @protected
         */
        this._reverseIndex = new Map();

        /**
         * @type {Map<string, WebSocket>} _globalIndex A map that stores connections by their unique ID.
         *
         * @protected
         */
        this._globalIndex = new Map();
    }

    /**
     * Indexes a given connection by given properties, properties must by existing properties of the connection's property "attributes", this method is chainable.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     * @param {?string[]} [properties] An array of strings containing the names of the connection properties the given connection must be indexed by.
     * @param {string} [container="properties"]
     *
     * @returns {ConnectionsIndex}
     *
     * @throws {InvalidArgumentException} If an invalid connection object is given.
     * @throws {InvalidArgumentException} If an invalid array of properties is given.
     */
    index(connection, properties = null, container = 'properties'){
        if ( !( connection instanceof ws ) ){
            throw new InvalidArgumentException('Invalid connection object.', 1);
        }
        // Get all the properties the given connection must be indexed by.
        const props = ConnectionsIndex._getConnectionProperties(connection, container);
        if ( props !== null ){
            // Get the properties the connection must be indexed by, if a list has been defined, otherwise use all the properties that have already been extracted.
            properties = ConnectionsIndex._getPropertyList(props, properties);
            const length = properties.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( props.hasOwnProperty(properties[i]) ){
                    // Get the map corresponding to the current property name.
                    let stack = this._index.get(properties[i]);
                    if ( typeof stack === 'undefined' ){
                        // Create the stack if it doesn't exist.
                        stack = new Map();
                        this._index.set(properties[i], stack);
                    }
                    // Index current property values.
                    ConnectionsIndex._indexProperty(connection, props[properties[i]], stack);
                    // Stores this property into the reverse index allowing this connection to be removed from index if required.
                    let reverseStack = this._reverseIndex.get(connection);
                    if ( typeof reverseStack === 'undefined' ){
                        reverseStack = new Map();
                        this._reverseIndex.set(connection, reverseStack);
                    }
                    reverseStack.set(properties[i], props[properties[i]]);
                }
            }
        }
        // Index this connection by its unique ID.
        if ( connection.hasOwnProperty('id') ){
            this._globalIndex.set(connection.id, connection);
        }
        return this;
    }

    /**
     * Removes a given connection from the index, this method is chainable.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @returns {ConnectionsIndex}
     *
     * @throws {InvalidArgumentException} If an invalid connection object is given.
     */
    remove(connection){
        if ( !( connection instanceof ws ) ){
            throw new InvalidArgumentException('Invalid connection object.', 1);
        }
        // Get all the properties this connection is indexed by.
        const properties = this._reverseIndex.get(connection);
        if ( typeof properties !== 'undefined' ){
            for ( const [property, value] of properties ){
                // Get the map where connections are indexed by this property name.
                const stack = this._index.get(property);
                if ( typeof stack !== 'undefined' ){
                    if ( Array.isArray(value) || value instanceof Set ){
                        // Current property value is an iterable unidimensional object, all values must be processed.
                        for ( const entry of value ){
                            // Get the connections indexed by current value.
                            const connectionList = stack.get(entry);
                            if ( typeof connectionList !== 'undefined' ){
                                connectionList.delete(connection);
                                if ( connectionList.size === 0 ){
                                    // Drop the connections set if it is empty.
                                    stack.delete(entry);
                                }
                            }
                        }
                    }else{
                        // Get the connections indexed by current value.
                        const connectionList = stack.get(value);
                        if ( typeof connectionList !== 'undefined' ){
                            connectionList.delete(connection);
                            if ( connectionList.size === 0 ){
                                // Drop the connections set if it is empty.
                                stack.delete(value);
                            }
                        }
                    }
                }
            }
            this._reverseIndex.delete(connection);
        }
        if ( connection.hasOwnProperty('id') ){
            this._globalIndex.delete(connection.id);
        }
        return this;
    }

    /**
     * Gets an indexed connection based on it's unique ID.
     *
     * @param {string} id A string representing the ID of the connection to look up, it is an UUID version 4 representation.
     *
     * @returns {?WebSocket} An instance of the class "WebSocket" representing the connection found or null if no connection has been found.
     *
     * @throws {InvalidArgumentException} If an invalid connection ID is given.
     */
    getConnectionByID(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid connection ID.', 1);
        }
        const connection = this._globalIndex.get(id);
        return typeof connection === 'undefined' ? null : connection;
    }

    /**
     * Returns all the connection matching the given property.
     *
     * @param {string} name A string containing the property name.
     * @param {*} value The property value, multiple values can be used as array of values.
     *
     * @returns {Set<WebSocket>} A set containing all the connections found, connections are represented as instances of the class "WebSocket".
     *
     * @throws {InvalidArgumentException} If an invalid property name is given.
     */
    getConnectionsByProperty(name, value){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid property name.', 1);
        }
        let connections = new Set();
        // Get the map that contains all the connections indexed by this property.
        const stack = this._index.get(name);
        if ( typeof stack !== 'undefined' ){
            if ( Array.isArray(value) ){
                // Multiple property values have been given, iterate them and return all the matching connections.
                const length = value.length;
                for ( let i = 0 ; i < length ; i++ ){
                    // TODO: Add support for iterable objects as property value.
                    const connectionList = stack.get(value[i]);
                    if ( typeof connectionList !== 'undefined' ){
                        for ( const connection of connectionList ){
                            connections.add(connection);
                        }
                    }
                }
            }else{
                // Get all the connections indexed by this property value.
                // TODO: Add support for iterable objects as property value.
                const connectionList = stack.get(value);
                if ( typeof connectionList !== 'undefined' ){
                    connections = connectionList;
                }
            }
        }
        return connections;
    }

    /**
     * Returns all the connection matching the given properties.
     *
     * @param {?Object.<string, *>} properties An object containing the properties as key/value pairs, if null all the registered connections will be returned.
     *
     * @returns {IterableIterator<WebSocket>} An iterator that yields the connections found, connections are represented as instances of the class "WebSocket".
     */
    *getConnections(properties = null){
        if ( typeof properties !== 'object' ){
            throw new InvalidArgumentException('Invalid properties', 1);
        }
        // If no property has been defined, use as stack the whole connections list.
        const stacks = properties === null ? [this._globalIndex.values()] : [];
        if ( properties !== null ){
            // Loop the given properties and find connections matching them.
            for ( const name in properties ){
                if ( properties.hasOwnProperty(name) && name !== '' && typeof name === 'string' ){
                    stacks.push(this.getConnectionsByProperty(name, properties[name]));
                }
            }
        }
        // Compute an intersection between the connections found.
        for ( const connection of stacks[0] ){
            let i = 1;
            if ( stacks.length > 1 ){
                // Intersection takes sense only if the number of stacks found is greater than one.
                while ( i < stacks.length && stacks[i].has(connection) ){
                    // Increment the count each time a connection is found in another stack.
                    i++;
                }
            }
            if ( i === stacks.length ){
                // This connection has been found in each stack, then yield it.
                yield connection;
            }
        }
    }

    /**
     * Returns all the connections that have been indexed within this class instance.
     *
     * @returns {IterableIterator<WebSocket>} An iterator that yields every connection defined.
     */
    getAllConnections(){
        return this._globalIndex.values();
    }
}

module.exports = ConnectionsIndex;
