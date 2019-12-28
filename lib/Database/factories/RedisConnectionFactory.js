'use strict';

const ConnectionFactory = require('./ConnectionFactory');
const RedisConnection = require('../connections/RedisConnection');
const RedisClusteredConnection = require('../connections/RedisClusteredConnection');
const {
    InvalidArgumentException
} = require('../../Exceptions');

class RedisConnectionFactory extends ConnectionFactory {
    /**
     * Generates a connection object based on the given properties.
     *
     * @param {object} block An object representing the connection properties obtained from a configuration file.
     *
     * @returns {RedisConnection} An instance of the class "RedisConnection" representing the connection.
     *
     * @private
     */
    static _generateConnection(block){
        if ( block === null || typeof block !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        let connection = new RedisConnection();
        if ( block.host !== '' && typeof block.host === 'string' ){
            connection.setHost(block.host);
        }
        if ( block.port !== null && !isNaN(block.port) && block.port > 0 && block.port <= 65535 ){
            connection.setPort(block.port);
        }
        if ( block.path !== '' && typeof block.path === 'string' ){
            connection.setPath(block.path);
        }
        if ( block.database !== null && !isNaN(block.database) && block.database >= 0 ){
            connection.setDatabase(block.database);
        }
        if ( block.password !== '' && typeof block.password === 'string' ){
            connection.setPassword(block.password);
        }
        return connection;
    }

    /**
     * Generates an object that represents the connection with multiple Redis servers.
     *
     * @param {object} block An object representing the connection properties obtained from a configuration file.
     *
     * @returns {RedisClusteredConnection} An instance of the class "RedisClusteredConnection" representing the connection.
     *
     * @private
     */
    static _generateClusteredConnection(block){
        if ( !Array.isArray(block) || block.length === 0 ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        const cluster = new RedisClusteredConnection();
        // Add each connection defined within the cluster block to the clustered connection object.
        const length = block.length;
        for ( let j = 0 ; j < length ; j++ ){
            let weight = parseFloat(block[i].weight);
            if ( weight === null || isNaN(weight) ){
                weight = 1;
            }
            const connection = RedisConnectionFactory._generateConnection(block[i]);
            cluster.addConnection(connection, weight);
        }
        return cluster;
    }

    /**
     * Generates the connection object based on the given properties fetched from a configuration file.
     *
     * @param {object} block An object containing the connection properties.
     *
     * @returns {Promise<RedisConnection|RedisClusteredConnection>} An instance of the class "RedisConnection", if multiple connections were found, an instance of the class "RedisClusteredConnection" will be returned instead.
     */
    static async createFromConfigBlock(block){
        if ( Array.isArray(block) ){
            return RedisConnectionFactory._generateClusteredConnection(block);
        }
        return RedisConnectionFactory._generateConnection(block);
    }
}

module.exports = RedisConnectionFactory;