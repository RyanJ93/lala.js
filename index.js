'use strict';

// Exporting constants.
const constants = require('./lib/constants');
module.exports.VERSION = constants.VERSION;
module.exports.IS_INSIDE_DOCKER = constants.IS_INSIDE_DOCKER;
module.exports.IM_INSIDE_DOCKER = constants.IS_INSIDE_DOCKER;
module.exports.AM_I_INSIDE_DOCKER = constants.IS_INSIDE_DOCKER;
module.exports.IS_ON_HEROKU = constants.IS_ON_HEROKU;
module.exports.IM_ON_HEROKU = constants.IS_ON_HEROKU;
module.exports.AM_I_ON_HEROKU = constants.IS_ON_HEROKU;

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
module.exports.TokenExpiredHTTPException = exceptions.TokenExpiredHTTPException;
module.exports.UserNotFoundException = exceptions.UserNotFoundException;
module.exports.MalformedAuthenticationAttemptHTTPException = exceptions.MalformedAuthenticationAttemptHTTPException;
module.exports.TooManyRequestsHTTPException = exceptions.TooManyRequestsHTTPException;
module.exports.RequestEntityTooLargeHTTPException = exceptions.RequestEntityTooLargeHTTPException;
module.exports.BadRequestHTTPException = exceptions.BadRequestHTTPException;
module.exports.URITooLongHTTPException = exceptions.URITooLongHTTPException;
module.exports.NotImplementedYetException = exceptions.NotImplementedYetException;
module.exports.IOException = exceptions.IOException;
module.exports.UserNotFoundHTTPException = exceptions.UserNotFoundHTTPException;
module.exports.UpgradeRejectedHTTPException = exceptions.UpgradeRejectedHTTPException;
module.exports.NotAcceptableHTTPException = exceptions.NotAcceptableHTTPException;
module.exports.CloneNotSupportedException = exceptions.CloneNotSupportedException;
module.exports.RangeNotSatisfiableHTTPException = exceptions.RangeNotSatisfiableHTTPException;
module.exports.UnallowedCORSOriginHTTPException = exceptions.UnallowedCORSOriginHTTPException;
module.exports.DependencyMissingException = exceptions.DependencyMissingException;

// Including built-in modules.
const authenticator = require('./lib/Authenticator');
module.exports.Authenticator = authenticator.Authenticator;
module.exports.HTTPAuthenticator = authenticator.HTTPAuthenticator;
module.exports.BasicHTTPAuthenticator = authenticator.BasicHTTPAuthenticator;
module.exports.DigestHTTPAuthentication = authenticator.DigestHTTPAuthentication;
module.exports.CredentialsProviders = authenticator.CredentialsProviders;
module.exports.AuthenticatedUser = authenticator.AuthenticatedUser;
module.exports.AuthenticationResult = authenticator.AuthenticationResult;
module.exports.UserSession = authenticator.UserSession;
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
const logger = require('./lib/Logger');
module.exports.Logger = logger.Logger;
module.exports.reporters = logger.reporters;
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
module.exports.BaseRoute = router.BaseRoute;
module.exports.Route = router.Route;
module.exports.ResourceRoute = router.ResourceRoute;
module.exports.Router = router.Router;
module.exports.RouterRepository = router.RouterRepository;
module.exports.RouteRepository = router.RouteRepository;
module.exports.ViewRoute = router.ViewRoute;
module.exports.ParamMiddlewares = router.ParamMiddlewares;
module.exports.RedirectRoute = router.RedirectRoute;
module.exports.ResolvedRoute = router.ResolvedRoute;
module.exports.RouteStorage = router.RouteStorage;
module.exports.RouteResolver = router.RouteResolver;
module.exports.Policy = router.Policy;
module.exports.PermissionPolicyRegistry = router.PermissionPolicyRegistry;
module.exports.mixins = router.mixins;
const server = require('./lib/Server');
module.exports.Server = server.Server;
module.exports.RoutedServer = server.RoutedServer;
module.exports.HTTPCore = server.HTTPCore;
module.exports.HTTPServer = server.HTTPServer;
module.exports.HTTPSServer = server.HTTPSServer;
module.exports.WSServer = server.WSServer;
module.exports.WSSServer = server.WSSServer;
module.exports.UNIXSocketServer = server.UNIXSocketServer;
module.exports.ServerRepository = server.ServerRepository;
module.exports.ServerProviderRepository = server.ServerProviderRepository;
module.exports.ServerConfigurator = server.ServerConfigurator;
module.exports.InterceptorRunner = server.InterceptorRunner;
module.exports.MessageProtocol = server.MessageProtocol;
module.exports.interceptors = server.interceptors;
module.exports.responses = server.responses;
module.exports.processors = server.processors;
module.exports.ServerSupport = server.support;
module.exports.HTTPHeaderManagers = server.HTTPHeaderManagers;
const types = require('./lib/Types');
module.exports.AuthToken = types.AuthToken;
module.exports.Credentials = types.Credentials;
module.exports.UploadedFile = types.UploadedFile;
module.exports.Cookie = types.Cookie;
module.exports.Context = types.Context;
module.exports.TLSContext = types.TLSContext;
module.exports.WebSocketMessage = types.WebSocketMessage;
const utils = require('./lib/Utils');
module.exports.BufferUtils = utils.BufferUtils;
module.exports.DNSUtils = utils.DNSUtils;
module.exports.EmailUtils = utils.EmailUtils;
module.exports.EmailAddressTester = utils.EmailAddressTester;
module.exports.StringUtils = utils.StringUtils;
const view = require('./lib/View');
module.exports.BaseView = view.BaseView;
module.exports.BaseViewFactory = view.BaseViewFactory;
module.exports.ParametrizedView = view.ParametrizedView;
module.exports.ParametrizedViewFactory = view.ParametrizedViewFactory;
module.exports.View = view.View;
module.exports.ViewFactory = view.ViewFactory;
module.exports.HTMLView = view.HTMLView;
module.exports.HTMLViewFactory = view.HTMLViewFactory;
module.exports.SourceRepository = view.SourceRepository;
module.exports.PresentersRepository = view.PresentersRepository;
module.exports.ViewRepository = view.ViewRepository;
module.exports.engines = view.engines;
const support = require('./lib/Support');
module.exports.WeakIndex = support.WeakIndex;
module.exports.Keywords = support.Keywords;
module.exports.Mimetype = support.Mimetype;
module.exports.Factory = support.Factory;
module.exports.Mixin = support.Mixin;
module.exports.mixins = support.mixins;
module.exports.Serializer = support.Serializer;
module.exports.BufferSerializer = support.BufferSerializer;
module.exports.StreamSerializer = support.StreamSerializer;
module.exports.ControllerClosure = support.ControllerClosure;
const controller = require('./lib/Controller');
module.exports.Controller = controller.Controller;
const service = require('./lib/Service');
module.exports.Service = service.Service;
const typify = require('./lib/Typify');
module.exports.Typify = typify.Typify;
module.exports.TypeRepository = typify.TypeRepository;
const form = require('./lib/Form');
module.exports.Form = form.Form;
const validator = require('./lib/Validator');
module.exports.ValidationRuleRepository = validator.ValidationRuleRepository;
module.exports.validationRules = validator.validationRules;
module.exports.Validator = validator.Validator;

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
    // Exporting helpers.
    module.exports.helpers = require('./lib/Helpers');
    // Load configuration for internal sub-modules.
    await module.exports.Database.initFromConfig();
    //TODO: Disabled until factory classes will be supported.
    //await module.exports.Server.initFromConfig();
    await module.exports.Cache.initFromConfig();
    // Run user defined providers.
    if ( options.hasOwnProperty('providers') && Array.isArray(options.providers) ){
        // Execute those provider "synchronously".
        const length = options.providers.length;
        for ( let i = 0 ; i < length ; i++ ){
            await module.exports.ProviderHelper.setupProvider(options.providers[i]);
        }
    }
    if ( options.hasOwnProperty('parallelProviders') && Array.isArray(options.parallelProviders) ){
        const processes = [], length = options.parallelProviders.length;
        for ( let i = 0 ; i < length ; i++ ){
            processes.push(module.exports.ProviderHelper.setupProvider(options.parallelProviders[i]));
        }
        await Promise.all(processes);
    }
    // Set handlers for uncaught exceptions.
    process.on('uncaughtException', (error) => {
        module.exports.Logger.logError(error);
    });
    process.on('unhandledRejection', (error) => {
        if ( error instanceof Error ){
            module.exports.Logger.logError(error);
        }else{
            module.exports.Logger.log(error.toString(), {
                level: module.exports.Logger.LEVEL_ERROR
            });
        }
    });
};

module.exports.init = module.exports.fallFromTheSky;
