'use strict';

const ConnectionFactory = require('./ConnectionFactory');
const MemcachedConnection = require('../connections/MemcachedConnection');
const MemcachedClusteredConnection = require('../connections/MemcachedClusteredConnection');
const {
    InvalidArgumentException
} = require('../../Exceptions');

class MemcachedConnectionFactory extends ConnectionFactory {
    /**
     * Generates a connection object based on the given properties.
     *
     * @param {object} block An object representing the connection properties obtained from a configuration file.
     *
     * @returns {MemcachedConnection} An instance of the class "MemcachedConnection" representing the connection.
     *
     * @private
     */
    static _generateConnection(block){
        if ( block === null || typeof block !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        let connection = new MemcachedConnection();
        if ( block.host !== '' && typeof block.host === 'string' ){
            connection.setHost(block.host);
        }
        if ( block.port !== null && !isNaN(block.port) && block.port > 0 && block.port <= 65535 ){
            connection.setPort(block.port);
        }
        return connection;
    }

    /**
     * Generates an object that represents the connection with multiple Redis servers.
     *
     * @param {object} block An object representing the connection properties obtained from a configuration file.
     *
     * @returns {MemcachedClusteredConnection} An instance of the class "MemcachedClusteredConnection" representing the connection.
     *
     * @private
     */
    static _generateClusteredConnection(block){
        if ( !Array.isArray(block) || block.length === 0 ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        const cluster = new MemcachedClusteredConnection();
        // Add each connection defined within the cluster block to the clustered connection object.
        const length = block.length;
        for ( let j = 0 ; j < length ; j++ ){
            const weight = parseFloat(block[i].weight);
            if ( weight === null || isNaN(weight) ){
                weight = 1;
            }
            const connection = MemcachedConnectionFactory._generateConnection(block[i]);
            cluster.addConnection(connection, weight);
        }
        return cluster;
    }

    /**
     * Generates the connection object based on the given properties fetched from a configuration file.
     *
     * @param {object} block An object containing the connection properties.
     *
     * @returns {Promise<MemcachedConnection|MemcachedClusteredConnection>} An instance of the class "MemcachedConnection", if multiple connections were found, an instance of the class "MemcachedClusteredConnection" will be returned instead.
     */
    static async createFromConfigBlock(block){
        if ( Array.isArray(block) ){
            return MemcachedConnectionFactory._generateClusteredConnection(block);
        }
        return MemcachedConnectionFactory._generateConnection(block);
    }
}

module.exports = MemcachedConnectionFactory;