'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const ClusteredConnection = require('./ClusteredConnection');
const {
    UnresolvedDependencyException
} = require('../../Exceptions');

// Try importing required external module (if it has been installed).
let _redis = null;
try{
    _redis = require('redis');
}catch{
    Logger.log('Failed loading "redis" module.', 2);
}

/**
 * The class used to represent a bunch of connections to multiple Redis servers.
 */
//TODO: Complete this class once cluster support will be available for the Redis driver in use.
class RedisClusteredConnection extends ClusteredConnection {
    /**
     * The class constructor.
     *
     * @throws {UnresolvedDependencyException} If the Redis module was not found.
     */
    constructor(){
        super();
        if ( _redis === null ){
            throw new UnresolvedDependencyException('Redis module missing, run "npm i redis" first.', 1);
        }
    }
}

module.exports = RedisClusteredConnection;
