'use strict';

// Exporting helpers.
module.exports = require('./lib/helpers');

// Including exceptions.
const exceptions = require('./lib/Exceptions');
module.exports.Exception = exceptions.Exception;
module.exports.InvalidArgumentException = exceptions.InvalidArgumentException;
module.exports.ForbiddenHTTPException = exceptions.ForbiddenHTTPException;
module.exports.NotFoundException = exceptions.NotFoundException;
module.exports.NotFoundHTTPException = exceptions.NotFoundHTTPException;
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
module.exports.HTTPException = exceptions.HTTPException;
module.exports.InvalidHTTPRequestException = exceptions.InvalidHTTPRequestException;
module.exports.MethodNotAllowedHTTPException = exceptions.MethodNotAllowedHTTPException;
module.exports.UnauthorizedHTTPException = exceptions.UnauthorizedHTTPException;
module.exports.AuthenticationRequiredHTTPException = exceptions.AuthenticationRequiredHTTPException;
module.exports.AuthenticationHTTPException = exceptions.AuthenticationHTTPException;
module.exports.UnsupportedAuthenticationMethodHTTPException = exceptions.UnsupportedAuthenticationMethodHTTPException;
module.exports.InvalidCredentialsHTTPException = exceptions.InvalidCredentialsHTTPException;
module.exports.TokenExpiredException = exceptions.TokenExpiredException;
module.exports.UserNotFoundException = exceptions.UserNotFoundException;
module.exports.MalformedAuthenticationAttemptHTTPException = exceptions.MalformedAuthenticationAttemptHTTPException;

// Including built-in modules.
const authenticator = require('./lib/Authenticator');
module.exports.Authenticator = authenticator.Authenticator;
module.exports.HTTPAuthenticator = authenticator.HTTPAuthenticator;
module.exports.BasicHTTPAuthenticator = authenticator.BasicHTTPAuthenticator;
module.exports.DigestHTTPAuthentication = authenticator.DigestHTTPAuthentication;
const cache = require('./lib/Cache');
module.exports.Cache = cache.Cache;
module.exports.CacheDriver = cache.CacheDriver;
module.exports.CacheDrivers = cache.CacheDrivers;
module.exports.CacheDriverRepository = cache.CacheDriverRepository;
module.exports.CacheTemplate = cache.CacheTemplate;
module.exports.CacheTemplateRepository = cache.CacheTemplateRepository;
module.exports.CacheRepository = cache.CacheRepository;
module.exports.Cluster = require('./lib/Cluster').Cluster;
module.exports.Command = require('./lib/Command').Command;
module.exports.Config = require('./lib/Config').Config;
const database = require('./lib/Database');
module.exports.Database = database.Database;
module.exports.DatabaseDrivers = database.DatabaseDrivers;
module.exports.DatabaseConnections = database.DatabaseConnections;
module.exports.ConnectionRepository = database.ConnectionRepository;
module.exports.ConnectionFactory = database.ConnectionFactory;
module.exports.DriverRepository = database.DriverRepository;
module.exports.ConnectionFactoryHelper = database.ConnectionFactoryHelper;
module.exports.DatabaseFactories = database.DatabaseFactories;
module.exports.Logger = require('./lib/Logger').Logger;
const model = require('./lib/Model');
module.exports.Model = model.Model;
module.exports.User = model.User;
module.exports.Peke = require('./lib/ORM').Peke;
const provider = require('./lib/Provider');
module.exports.Provider = provider.Provider;
module.exports.nativeProviders = provider.nativeProviders;
module.exports.ProviderHelper = provider.ProviderHelper;
const repository = require('./lib/Repository');
module.exports.Repository = repository.Repository;
const router = require('./lib/Routing');
module.exports.Route = router.Route;
module.exports.ResourceRoute = router.ResourceRoute;
module.exports.Router = router.Router;
module.exports.BaseRoute = router.BaseRoute;
module.exports.RouterRepository = router.RouterRepository;
module.exports.RouteResolver = router.RouteResolver;
module.exports.ViewRoute = router.ViewRoute;
const server = require('./lib/Server');
module.exports.Server = server.Server;
module.exports.RoutedServer = server.RoutedServer;
module.exports.HTTPServer = server.HTTPServer;
module.exports.HTTPSServer = server.HTTPSServer;
module.exports.WSServer = server.WSServer;
module.exports.WSSServer = server.WSSServer;
module.exports.UNIXSocketServer = server.UNIXSocketServer;
module.exports.Request = server.Request;
module.exports.ServerRepository = server.ServerRepository;
module.exports.ServerProviderRepository = server.ServerProviderRepository;
module.exports.ServerConfigurator = server.ServerConfigurator;
const types = require('./lib/Types');
module.exports.AuthToken = types.AuthToken;
module.exports.Credentials = types.Credentials;
const view = require('./lib/View');
module.exports.View = view.View;
const support = require('./lib/Support');
module.exports.WeakIndex = support.WeakIndex;
module.exports.Keywords = support.Keywords;
module.exports.Mimetype = support.Mimetype;

/**
 * Where the magic begins 🍭.
 *
 * @param {object} [options] An object containing the custom options to consider in framework initialization phase.
 *
 * @returns {Promise<void>}
 *
 * @async
 */
module.exports.fallFromTheSky = async function(options){
    if ( options === null || typeof(options) !== 'object' ){
        options = {};
    }
    if ( options.hasOwnProperty('config') && options.config !== '' && typeof options.config === 'string' ){
        // Load the given configuration file.
        await module.exports.Config.loadFromFile(options.config);
    }
    if ( options.hasOwnProperty('clusterConfig') && options.clusterConfig !== '' && typeof options.clusterConfig === 'string' ){
        try{
            await module.exports.Cluster.loadConfigurationFromFile(options.clusterConfig);
        }catch(ex){
            if ( ex.constructor.name === 'InvalidArgumentException' && ex.getCode() ){
                await module.exports.Cluster.writeConfig();
            }
        }
    }
    // Setup internal components such as cache, sessions, server and routing engine.
    await module.exports.ProviderHelper.setupNativeProviders();
    if ( options.hasOwnProperty('providers') && Array.isArray(options.providers) ){
        // Setup external components.
        let processes = [];
        const length = options.providers.length;
        for ( let i = 0 ; i < length ; i++ ){
            processes.push(module.exports.ProviderHelper.setupProvider(options.providers[i]));
        }
        await Promise.all(processes);
    }
    // Load configuration for internal sub-modules.
    await module.exports.Database.initFromConfig();
    await module.exports.Server.initFromConfig();
    await module.exports.Logger.initFromConfig();
    await module.exports.Cache.initFromConfig();
    // Set handlers for uncaught exceptions.
    process.on('uncaughtException', (error) => {
        module.exports.Logger.reportError(error);
    });
    process.on('unhandledRejection', (error) => {
        module.exports.Logger.reportError(error);
    });
};

Object.defineProperty(module.exports, 'VERSION', {
    value: '0.0.5',
    writable: false,
    enumerable: true,
    configurable: true
});