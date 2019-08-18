'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const {
    InvalidArgumentException,
    NotCallableException,
    RuntimeException
} = require('../../Exceptions');

/**
 * The base class used to create classes to represent multiple connections within a single object.
 *
 * @abstract
 */
class ClusteredConnection extends EventEmitter {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'ClusteredConnection' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {Connection[]} _connections A sequential array that contains all the connections, represented as instances of the appropriate class, that this cluster is composed by.
         *
         * @private
         */
        this._connections = [];

        /**
         * @type {Connection|null} _defaultConnection An instance of the class that represents a single connection and that will be defined as the first connection in the cluster to be used.
         *
         * @private
         */
        this._defaultConnection = null;

        /**
         * @type {{string: *}} _options An object containing the additional custom options that the clustered connection object that extends this class must take care of.
         *
         * @private
         */
        this._options = {};

        /**
         * @type {*|null} _connection The connection to the external service, according to the required driver or third part module.
         *
         * @private
         */
        this._connection = null;

        /**
         * @type {boolean} _connected If the external service has been connected successfully it will be set to "true", otherwise "false".
         *
         * @private
         */
        this._connected = false;

        // As for the same property in the "Connection" class, make this property more private in order to know when this primitive value changes.
        this.__connected = false;
    }

    /**
     * Sets the value for property "__connected", namely "_connected", emitting the change event.
     *
     * @param {boolean} value A boolean value representing the current state of the connection.
     *
     * @private
     */
    set _connected(value){
        value = value === true;
        if ( this.__connected !== value ){
            this.emit('connectionStateChanged', value);
        }
        this.__connected = value;
    }

    /**
     * Returns the value for property "__connected", namely "_connected".
     *
     * @returns {boolean} A boolean value representing the current state of the connection.
     *
     * @private
     */
    get _connected(){
        return this.__connected;
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
     * Sets the additional options to use when instantiating the cluster, this method is chainable.
     *
     * @param {({string: *}|null)} options An object containing the custom options as key/value pairs, if set to null, all the custom options will be dropped.
     *
     * @returns {ClusteredConnection}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setOptions(options){
        if ( options === null ){
            this._options = {};
            return this;
        }
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options object.', 1);
        }
        this._options = options;
        return this;
    }

    /**
     * Returns the additional options to use when instantiating the cluster.
     *
     * @returns {({string: *}|null)} An object containing the custom options as key/value pairs.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Adds a new connection to the list of all the available connections, this method is chainable.
     *
     * @param {object} connection An object representing the connection, it must implement the class "Connection".
     * @param {number} [weight=1] A floating point number greater than zero representing the priority of this connection in connection attempts.
     * @param {boolean} [isDefault=false] If set to "true" it means that this connection will be used by default in connection attempt.
     *
     * @returns {ClusteredConnection}
     *
     * @throws {InvalidArgumentException} If the given connection is an invalid object or if it doesn't implement the class "Connection".
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
     * @returns {(object|null)} The connection object or null if no connection has been initialized.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Establishes a connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
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
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
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
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async disconnect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = ClusteredConnection;
