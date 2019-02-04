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

class MemcachedClusteredConnection extends ClusteredConnection {
    /**
     * The class constructor.
     */
    constructor(){
        super();
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