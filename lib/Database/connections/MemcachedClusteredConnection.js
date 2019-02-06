'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const ClusteredConnection = require('./ClusteredConnection');
const MemcachedConnection = require('./MemcachedConnection');
const {
    UnresolvedDependencyException,
    BadMethodCallException
} = require('../../Exceptions');

/**
 * @type {object} _memcached An object representing the Memcached driver.
 *
 * @private
 */
let _memcached = null;
try{
    // Try importing required external module (if it has been installed).
    _memcached = require('memcached');
}catch(ex){
    Logger.log('Failed loading "memcached" module.', 2);
}

/**
 * The class used to represent a bunch of connections to multiple Memcached servers.
 */
class MemcachedClusteredConnection extends ClusteredConnection {
    /**
     * The class constructor.
     *
     * @throws {UnresolvedDependencyException} If the Memcached module was not found.
     */
    constructor(){
        super();
        if ( _memcached === null ){
            throw new UnresolvedDependencyException('Memcached module missing, run "npm i memcached" first.', 1);
        }
    }

    /**
     * Adds a new connection to the list of all the available connections, this method is chainable.
     *
     * @param {MemcachedConnection} connection An instance of the class "MemcachedConnection" representing the connection to add.
     * @param {number} [weight=1] A floating point number greater than zero representing the priority of this connection in connection attempts.
     * @param {boolean} [isDefault=false] If set to "true" it means that this connection will be used by default in connection attempt.
     *
     * @returns {MemcachedClusteredConnection}
     *
     * @throws {InvalidArgumentException} If an invalid connection is given.
     */
    addConnection(connection, weight = 1, isDefault = false){
        if ( !connection instanceof MemcachedConnection ){
            throw new InvalidArgumentException('Invalid connection.', 1);
        }
        super.addConnection(connection, weight, isDefault);
        return this;
    }

    /**
     * Establishes a connection with all the defined Memcached nodes.
     *
     * @returns {Promise<void>}
     *
     * @throws {BadMethodCallException} If no Memcached has been defined.
     * @throws {UnresolvedDependencyException} If the Memcached module was not found.
     *
     * @async
     */
    async connect() {
        if ( !this.hasConnections() ){
            throw new BadMethodCallException('No connection defined.', 1);
        }
        if ( _memcached === null ){
            throw new UnresolvedDependencyException('Memcached module missing, run "npm install memcached" first.', 2);
        }
        let nodes = {};
        this.getConnections().forEach((node) => {
            const url = node.connection.toString();
            nodes[url] = node.weight;
        });
        this._connected = false;
        // Initialize the Memcached instance and connect to the server.
        this._connection = new _memcached(nodes, this._options);
        this._connected = true;
    }

    /**
     * Establishes a new connection with all the defined Memcached nodes.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async reconnect(){
        await this.disconnect();
        await this.connect();
    }

    /**
     * Closes the connection with the all the nodes.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async disconnect(){
        if ( this._connected === true ){
            this._connection.end();
        }
    }

    /**
     * Checks if the connection is still alive.
     *
     * @returns {boolean} If the Memcached cluster is still connected will be returned "true", otherwise "false".
     */
    isConnected(){
        return this._connected === true;
    }
}

module.exports = MemcachedClusteredConnection;