'use strict';

module.exports = {
    RedisProvider: require('./RedisProvider'),
    MemcachedProvider: require('./MemcachedProvider'),
    SQLite3Provider: require('./SQLite3Provider'),
    FileSupportProvider: require('./FileSupportProvider')
};
