'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const ClusteredConnection = require('./ClusteredConnection');
const RedisConnection = require('./RedisConnection');
const InvalidArgumentException = require('../../Exceptions/InvalidArgumentException');

// Try importing required external module (if it has been installed).
let _redis = null;
try{
    _redis = require('redis');
}catch(ex){
    Logger.log('Failed loading "redis" module.', 2);
}

//TODO: Complete this class once cluster support will be available for the Redis driver in use.
class RedisClusteredConnection extends ClusteredConnection {
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
        let cluster = new RedisClusteredConnection();
        // Add each connection defined within the cluster block to the clustered connection object.
        for ( let j = 0 ; j < block.length ; j++ ){
            let weight = parseFloat(block[i].weight);
            if ( weight === null || isNaN(weight) ){
                weight = 1;
            }
            let connection = RedisConnection.createFromConfigBlock(block[i]);
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
}

module.exports = RedisClusteredConnection;