'use strict';

// Exporting helpers.
module.exports = require('./lib/helpers');

// Including exceptions.
let exceptions = require('./lib/Exceptions');
module.exports.Exception = exceptions.Exception;
module.exports.InvalidArgumentException = exceptions.InvalidArgumentException;
module.exports.ForbiddenHttpException = exceptions.ForbiddenHttpException;
module.exports.NotFoundHttpException = exceptions.NotFoundHttpException;
module.exports.MisconfigurationException = exceptions.MisconfigurationException;
module.exports.RequestRejectedException = exceptions.RequestRejectedException;
module.exports.NotCallableException = exceptions.NotCallableException;
module.exports.DriverNotConnectedException = exceptions.DriverNotConnectedException;
module.exports.DriverNotDefinedException = exceptions.DriverNotDefinedException;
module.exports.RuntimeException = exceptions.RuntimeException;
module.exports.UnresolvedDependencyException = exceptions.UnresolvedDependencyException;
module.exports.BadMethodCallException = exceptions.BadMethodCallException;
module.exports.UnsupportedMethodException = exceptions.UnsupportedMethodException;
module.exports.DuplicateEntryException = exceptions.DuplicateEntryException;
module.exports.SerializationException = exceptions.SerializationException;
module.exports.ParseException = exceptions.ParseException;
module.exports.AuthenticationException = exceptions.AuthenticationException;

// Including built-in modules.
module.exports.Authenticator = require('./lib/Authenticator').Authenticator;
let cache = require('./lib/Cache');
module.exports.Cache = cache.Cache;
module.exports.CacheDriver = cache.CacheDriver;
module.exports.CacheDrivers = cache.CacheDrivers;
module.exports.Cluster = require('./lib/Cluster').Cluster;
module.exports.Command = require('./lib/Command').Command;
module.exports.Config = require('./lib/Config').Config;
let database = require('./lib/Database');
module.exports.Database = database.Database;
module.exports.DatabaseDrivers = database.DatabaseDrivers;
module.exports.DatabaseConnections = database.DatabaseConnections;
module.exports.Logger = require('./lib/Logger').Logger;
let model = require('./lib/Model');
module.exports.Model = model.Model;
module.exports.User = model.User;
module.exports.Peke = require('./lib/ORM').Peke;
let router = require('./lib/Routing');
module.exports.Route = router.Route;
module.exports.ResourceRoute = router.ResourceRoute;
module.exports.Router = router.Router;
let server = require('./lib/Server');
module.exports.Server = server.Server;
module.exports.Request = server.Request;
module.exports.View = require('./lib/View').View;

module.exports.fallFromTheSky = async function(options){
    if ( options === null || typeof(options) !== 'object' ){
        options = {};
    }
    await module.exports.Config.loadFromFile(options.config);
    try{
        await module.exports.Cluster.loadConfigurationFromFile(options.clusterConfig);
    }catch(ex){
        if ( ex.constructor.name === 'InvalidArgumentException' && ex.getCode() ){
            await module.exports.Cluster.writeConfig();
        }
    }
    await module.exports.Database.initFromConfig();
    await module.exports.Server.initFromConfig();
    await module.exports.Logger.initFromConfig();
    // Register cache drivers.
    let processes = [
        module.exports.Cache.registerDriver('database', module.exports.CacheDrivers.DatabaseCacheDriver),
        module.exports.Cache.registerDriver('file', module.exports.CacheDrivers.FileCacheDriver),
        module.exports.Cache.registerDriver('memcached', module.exports.CacheDrivers.MemcachedCacheDriver),
        module.exports.Cache.registerDriver('redis', module.exports.CacheDrivers.RedisCacheDriver),
        module.exports.Cache.registerDriver('sqlite3', module.exports.CacheDrivers.SQLite3CacheDriver)
    ];
    // Wait for all cache drivers to be 
    Promise.all(processes).then(() => {
        module.exports.Cache.initFromConfig();
    });
    process.on('uncaughtException', (error) => {
        module.exports.Logger.reportError(error);
    });
    process.on('unhandledRejection', (error) => {
        module.exports.Logger.reportError(error);
    });
};
