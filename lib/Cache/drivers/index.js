'use strict';

module.exports = {
    DatabaseCacheDriver: require('./DatabaseCacheDriver'),
    FileCacheDriver: require('./FileCacheDriver'),
    LocalCacheDriver: require('./LocalCacheDriver'),
    MemcachedCacheDriver: require('./MemcachedCacheDriver'),
    RedisCacheDriver: require('./RedisCacheDriver'),
    SQLite3CacheDriver: require('./SQLite3CacheDriver'),
};