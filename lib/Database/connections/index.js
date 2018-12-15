'use strict';

module.exports = {
    Connection: require('./Connection'),
    ClusteredConnection: require('./ClusteredConnection'),
    RedisConnection: require('./RedisConnection'),
    RedisClusteredConnection: require('./RedisClusteredConnection'),
    MemcachedConnection: require('./MemcachedConnection'),
    MemcachedClusteredConnection: require('./MemcachedClusteredConnection')
};
