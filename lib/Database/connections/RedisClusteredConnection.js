'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const ClusteredConnection = require('./ClusteredConnection');

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
     * The class constructor.
     */
    constructor(){
        super();
    }
}

module.exports = RedisClusteredConnection;