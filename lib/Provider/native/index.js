'use strict';

module.exports = {
    RedisProvider: require('./RedisProvider'),
    MemcachedProvider: require('./MemcachedProvider'),
    SQLite3Provider: require('./SQLite3Provider'),
    FileSupportProvider: require('./FileSupportProvider'),
    ServerProvider: require('./ServerProvider'),
    RoutingProvider: require('./RoutingProvider'),
    CacheProvider: require('./CacheProvider'),
    HelpersProvider: require('./HelpersProvider'),
    PresentersProvider: require('./PresentersProvider'),
    LoggerProvider: require('./LoggerProvider'),
    TypeProvider: require('./TypeProvider'),
    ValidationRuleProvider: require('./ValidationRuleProvider')
};
