'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException,
    NotCallableException
} = require('../../Exceptions');

/* abstract */ class ClusteredConnection {
    /**
     * The class constructor.
     */
    constructor(){
        this._connections = [];
        this._defaultConnection = null;
        this._options = {};
        this._connection = null;
        this._connected = false;
    }

    /**
     * Returns always true as this class represents multiple connections at once, pretty stupid to be honest.
     *
     * @returns {boolean} Simply "true".
     */
    isCluster(){
        return true;
    }

    /**
     * Adds a new connection to the list of all the available connections, this method is chainable.
     *
     * @param {object} connection An object representing the connection, it must implement the class "Connection".
     * @param {number} weight A floating point number greater than zero representing the priority of this connection in connection attempts.
     * @param {boolean} isDefault If set to "true" it means that this connection will be used by default in connection attempt.
     *
     * @returns {ClusteredConnection}
     *
     * @throws InvalidArgumentException If the given connection is an invalid object or if it doesn't implement the class "Connection".
     */
    addConnection(connection, weight = 1, isDefault = false){
        if ( connection === null || typeof connection !== 'object' || Object.getPrototypeOf(connection.constructor).name !== 'Connection' ){
            throw new InvalidArgumentException('Invalid connection object, it must implement the class "Connection".', 1);
        }
        this._connections.push({
            connection: connection,
            weight: weight === null || isNaN(weight) ? 1 : ( weight < 0 ? 0 : weight )
        });
        if ( isDefault === true ){
            this._defaultConnection = connection;
        }
        return this;
    }

    /**
     * Returns a list of all the registered connections.
     *
     * @returns {object[]} An associative array of objects representing the connections.
     */
    getConnections(){
        return this._connections;
    }

    /**
     * Removes all the registered connections, this method is chainable.
     *
     * @returns {ClusteredConnection}
     */
    dropConnections(){
        this._connections = [];
        this._defaultConnection = null;
        return this;
    }

    /**
     * Checks if at least one connection has been registered within the class instance.
     *
     * @returns {boolean} If at least once connection has been registered will be returned "true", otherwise "false".
     */
    hasConnections(){
        return this._connections.length !== 0;
    }

    /**
     * Returns the object that is used internally to represent and handle the connection.
     *
     * @returns {object|null} The connection object or null if no connection has been initialized.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Establishes a connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws NotCallableException If this method is called without been overridden and implemented.
     *
     * @async
     */
    async connect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Establishes a new connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws NotCallableException If this method is called without been overridden and implemented.
     *
     * @async
     */
    async reconnect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Closes the connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws NotCallableException If this method is called without been overridden and implemented.
     *
     * @async
     */
    async disconnect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = ClusteredConnection;