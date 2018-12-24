'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const ClusteredConnection = require('./ClusteredConnection');
const MemcachedConnection = require('./MemcachedConnection');
const {
    InvalidArgumentException,
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
     * Sets up a new clustered connection according to the nodes that have been defined within the given configuration block.
     *
     * @param {object} block An object representing the configuration block containing the node definitions to process.
     *
     * @throws InvalidArgumentException If an invalid configuration block is given.
     */
    static async createFromConfigBlock(block){
        if ( !Array.isArray(block) || block.length === 0 ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        let cluster = new MemcachedClusteredConnection();
        // Add each connection defined within the cluster block to the clustered connection object.
        for ( let j = 0 ; j < block.length ; j++ ){
            let weight = parseFloat(block[i].weight);
            if ( weight === null || isNaN(weight) ){
                weight = 1;
            }
            let connection = MemcachedConnection.createFromConfigBlock(block[i]);
            cluster.addConnection(connection, weight);
        }
        return cluster;
    }

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
     * @throws BadMethodCallException If no Memcached has been defined.
     * @throws UnresolvedDependencyException If the Memcached module was not found.
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
            let url = node.connection.toString();
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