'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const ResolvedRoute = require('../../Routing/ResolvedRoute');
const BaseRoute = require('../../Routing/BaseRoute');
const PermissionPolicyRegistry = require('../../Routing/PermissionPolicyRegistry');
const Authenticator = require('../../Authenticator/Authenticator');
const AuthenticationResult = require('../../Authenticator/AuthenticationResult');
const CSRFTokenStorage = require('../support/CSRFTokenStorage');
const CORSOptions = require('../support/CORSOptions');
const {
    InvalidArgumentException,
    ForbiddenHTTPException,
    UnallowedCORSOriginHTTPException
} = require('../../Exceptions');

/**
 * @callback middlewareHandler The callback function that implements an access middleware.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 * @param {middlewareNextHandler} next A function to invoke in order to keep the middleware chain running, if not invoked the chain will be broken and the connection rejected.
 *
 * @async
 */

/**
 * @callback middlewareNextHandler The function to invoke in order to execute next middleware function.
 *
 * @async
 */

/**
 * @typedef {Object} AuthorizationProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {?CSRFTokenStorage} CSRFTokenStorage An instance of the class "CSRFTokenStorage" used to store clients' CSRF tokens.
 * @property {?string} [CSRFFieldName="_csrf"] A string containing the name of the POST field that, if present, should be validated as the client's CSRF token.
 * @property {?string} [CSRFHeaderName="X-CSRF-TOKEN"] A string containing the name of the HTTP header that, if present, should be validated as the client's CSRF token.
 * @property {?number} [CSRFTokenTTL=86400] An integer number greater than zero representing the amount of seconds this token should live for, if null, this token will last forever.
 * @property {string} [_CSRFIDCookieName="lala.js::csrf-id"] A string containing the name of the cookie that will contains the CSRF ID on the client side.
 * @property {?CookieOptions} [_CSRFIDCookieOptions] An object containing some additional custom options to consider when declaring the cookie that will contains the CSRF ID on the client side.
 */

/**
 * Allows to determines if a request can be processed according to authorization and authentication settings defined.
 */
class AuthorizationProcessor extends Processor {
    /**
     * Compares a set of permissions to the user assigned permissions.
     *
     * @param {Permissions} entity The object whose permissions will be processed, typically a route, it must include the "Permissions" mixin.
     * @param {Set<string>} entityPermissions A set containing all the permissions of the object currently being processed.
     * @param {Set<string>} userPermissions A set containing all the permissions assigned to the user currently logged in.
     * @param {string} serializedUserPermissions A string serialization of all the permissions assigned to the user.
     *
     * @returns {boolean} If currently logged in user has all the permissions required by the given entity will be returned "true".
     *
     * @protected
     */
    static _comparePermissions(entity, entityPermissions, userPermissions, serializedUserPermissions){
        let valid = true;
        for ( const routePermission of entityPermissions ){
            if ( !userPermissions.has(routePermission) ){
                // If no user permission match directly current one, check for if a wildcard has been used instead.
                let found = false, i = 1;
                // Get all the patterns generated from current permission string, they will include all the supported combinations using a wildcard.
                const patterns = entity.getPermissionPatterns(routePermission);
                const length = patterns.length;
                // The index (i) will start from 1 in order to skip the combination that doesn't include any wildcard as it has been already checked using the first if in this loop.
                while ( !found && i < length ){
                    if ( serializedUserPermissions.indexOf(patterns[i]) !== -1 ){
                        found = true;
                    }
                    i++;
                }
                if ( !found ){
                    valid = false;
                    break;
                }
            }
        }
        return valid;
    }

    /**
     * Checks if the authenticated user is allowed to access to current route based on its permissions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    static _checkRoutePermissions(request){
        let allowed = true;
        const route = request.resolvedRoute.getRoute();
        const router = request.resolvedRoute.getRouter();
        // Get all the permissions required by the route that has been found.
        const routePermissions = route.getPermissions();
        // Get all the permissions required by the router the route found belongs to.
        const routerPermissions = router.getPermissions();
        if ( routePermissions.size > 0 || routerPermissions.size > 0 ){
            // Get all the permissions assigned to the currently logged in user.
            const userPermissions = request.authenticationResult.getPermissions();
            if ( !userPermissions.has('*') ){
                // Get a string serialization of all the permissions that have been assigned to the currently logged in user.
                const serializedUserPermissions = request.authenticationResult.getSerializedPermissions();
                if ( routePermissions.size > 0 ){
                    // Check if user permissions satisfy route required ones.
                    allowed = AuthorizationProcessor._comparePermissions(route, routePermissions, userPermissions, serializedUserPermissions);
                }
                if ( allowed && routePermissions.size > 0 ){
                    // Check if user permissions satisfy router required ones.
                    allowed = AuthorizationProcessor._comparePermissions(router, routerPermissions, userPermissions, serializedUserPermissions);
                }
            }
        }
        return allowed;
    }

    /**
     * Executes the given policies and then return is all of them allows current user to continue current request.
     *
     * @param {Map<string, Policy>} policies A map containing the policies to process and having as key an unique name assigned to the policy and as value an instance of the class that implements the policy to execute.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If current user is allowed to continue current request will be returned "true".
     *
     * @protected
     */
    static async _runPolicies(policies, request, response){
        let allowed = true;
        for ( const [name, policy] of policies ){
            const result = await policy.authorize(request.user, request, response);
            if ( result === false ){
                allowed = false;
                break;
            }
        }
        return allowed;
    }

    /**
     * Executes all the policies associated to the route or to the route's permissions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If all the policies executed return "true", then will be returned "true" as well and current request can continue.
     *
     * @protected
     */
    static async _checkRoutePolicies(request, response){
        const route = request.resolvedRoute.getRoute();
        const router = request.resolvedRoute.getRouter();
        // Executes all the policies associated to resolved route.
        const policies = route.getPolicies();
        let allowed = await AuthorizationProcessor._runPolicies(policies, request, response);
        if ( allowed ){
            // Executes all the policies associated to router the resolved route belongs to.
            const policies = router.getPolicies();
            allowed = await AuthorizationProcessor._runPolicies(policies, request, response);
        }
        if ( allowed ){
            // Executes all the policies that have been associated to the permissions associated to to resolved route.
            const routePermissions = route.getPermissions(), routerPermissions = router.getPermissions();
            const permissions = new Set([...routePermissions, ...routerPermissions]);
            for ( const permission of permissions ){
                // Get all the policies associated to current permission identifier.
                const policies = PermissionPolicyRegistry.get(permission);
                allowed = await AuthorizationProcessor._runPolicies(policies, request, response);
                if ( !allowed ){
                    break;
                }
            }
        }
        return allowed;
    }

    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {AuthorizationProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            CSRFTokenStorage: new CSRFTokenStorage(),
            CSRFFieldName: AuthorizationProcessor.CSRF_DEFAULT_PARAM_NAME,
            CSRFHeaderName: AuthorizationProcessor.CSRF_DEFAULT_HEADER_NAME,
            CSRFDefaultTTL: AuthorizationProcessor.CSRF_DEFAULT_TTL,
            CSRFIDCookieName: AuthorizationProcessor.CSRF_ID_COOKIE_NAME,
            CSRFIDCookieOptions: null
        };
    }

    /**
     * Returns the CSRF token provided by the client, if present.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {?string} A string containing the client provided CSRF token or null i none has been provided.
     *
     * @protected
     */
    _getClientProvidedCSRFToken(request){
        let clientToken = null;
        if ( this._CSRFFieldName !== null ){
            if ( typeof request.params === 'object' && typeof request.params[this._CSRFFieldName] === 'string' && request.params[this._CSRFFieldName] !== '' ){
                // Check is a CSRF token has been sent as a POST parameter.
                clientToken = request.params[this._CSRFFieldName];
            }else if ( typeof request.query === 'object' && typeof request.query[this._CSRFFieldName] === 'string' && request.query[this._CSRFFieldName] !== '' ){
                // Check is a CSRF token has been sent as a GET parameter.
                clientToken = request.query[this._CSRFFieldName];
            }
        }
        if ( clientToken === null && this._CSRFHeaderName !== null ){
            if ( typeof request.headers[this._CSRFHeaderName] === 'string' && request.headers[this._CSRFHeaderName] !== '' ){
                // Check is a CSRF token has been sent as a HTTP header.
                clientToken = request.headers[this._CSRFHeaderName];
            }
        }
        return clientToken;
    }

    /**
     * Generates and verifies the CSRF assigned to the current client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     * @param {boolean} CSRFTokenRequired If set to "true" a CSRF token must be passed by the client side in order to consider this request valid.
     *
     * @returns {Promise<void>}
     *
     * @throws {ForbiddenHTTPException} If the CSRF token sent by the client as POST parameter doesn't match the assigned one.
     * @throws {ForbiddenHTTPException} If no CSRF token has been sent by the client but a CSRF token is required by the route that has been triggered.
     *
     * @async
     * @protected
     */
    async _processCSRF(request, response, CSRFTokenRequired){
        if ( request.CSRFToken === null || typeof request.CSRFToken !== 'object' ){
            await this._attachCSRFToken(request, response);
        }
        if ( request.CSRFToken !== null ){
            // A valid and existing token ID has been found, check is a token value has been sent by the client.
            if ( this._CSRFFieldName !== null ){
                // Get the client provided CSRF token (if one has been sent).
                const tokenValue = this._getClientProvidedCSRFToken(request);
                // Check if a token has been sent then compare it to the assigned one.
                if ( tokenValue !== null ){
                    if ( request.CSRFToken.isNew === true ){
                        // If the CSRF token assigned to this request is new it cannot match the one being verified.
                        request.CSRFTokenVerificationStatus = false;
                        throw new ForbiddenHTTPException('CSRF token mismatch.', 1);
                    }
                    request.CSRFTokenVerificationStatus = this._CSRFTokenStorage.verify(request.CSRFToken.id, tokenValue);
                    if ( !request.CSRFTokenVerificationStatus ){
                        throw new ForbiddenHTTPException('CSRF token mismatch.', 1);
                    }
                }else if ( CSRFTokenRequired === true ){
                    throw new ForbiddenHTTPException('CSRF token mismatch.', 1);
                }
            }
        }
        if ( CSRFTokenRequired && request.CSRFTokenVerificationStatus === null ){
            throw new ForbiddenHTTPException('No CSRF token provided.', 2);
        }
    }

    /**
     * Looks up or create a CSRF token then adds it as a property to the given request object.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     */
    async _attachCSRFToken(request, response){
        let CSRFTokenObject = null;
        if ( request.cookies instanceof Map ){
            // Extract the cookie that contains the ID of the CSRF token that has been assigned to this client.
            const clientToken = request.cookies.get(this._CSRFIDCookieName);
            const clientTokenID = typeof clientToken === 'undefined' ? null : clientToken.getValue();
            CSRFTokenObject = clientTokenID === null ? null : this._CSRFTokenStorage.get(clientTokenID);
            if ( CSRFTokenObject === null ){
                CSRFTokenObject = await this._CSRFTokenStorage.create(this._CSRFTokenTTL);
                // Save the created token's ID as a cookie on the client side.
                response.setCookie(this._CSRFIDCookieName, CSRFTokenObject.id, Object.assign({
                    HTTPOnly: true,
                    secure: request.secure
                }, this._CSRFIDCookieOptions));
            }
            request.CSRFToken = CSRFTokenObject;
        }
    }

    /**
     * The class constructor.
     *
     * @param {?AuthorizationProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {?CSRFTokenStorage} _CSRFTokenStorage An instance of the class "CSRFTokenStorage" used to store clients' CSRF tokens.
         *
         * @protected
         */
        this._CSRFTokenStorage = new CSRFTokenStorage();

        /**
         * @type {?string} [_CSRFFieldName="_csrf"] A string containing the name of the field that, if present, should be validated as the client's CSRF token.
         *
         * @protected
         */
        this._CSRFFieldName = AuthorizationProcessor.CSRF_DEFAULT_PARAM_NAME;

        /**
         * @type {?string} [_CSRFHeaderName="X-CSRF-TOKEN"] A string containing the name of the HTTP header that, if present, should be validated as the client's CSRF token.
         *
         * @protected
         */
        this._CSRFHeaderName = AuthorizationProcessor.CSRF_DEFAULT_HEADER_NAME;

        /**
         * @type {?number} [_CSRFTokenTTL=86400] An integer number greater than zero representing the amount of seconds this token should live for, if null, this token will last forever.
         *
         * @protected
         */
        this._CSRFTokenTTL = AuthorizationProcessor.CSRF_DEFAULT_TTL;

        /**
         * @type {string} [_CSRFIDCookieName="lala.js::csrf-id"] A string containing the name of the cookie that will contains the CSRF ID on the client side.
         *
         * @protected
         */
        this._CSRFIDCookieName = AuthorizationProcessor.CSRF_ID_COOKIE_NAME;

        /**
         * @type {?CookieOptions} [_CSRFIDCookieOptions] An object containing some additional custom options to consider when declaring the cookie that will contains the CSRF ID on the client side.
         *
         * @protected
         */
        this._CSRFIDCookieOptions = null;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {AuthorizationProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {AuthorizationProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('CSRFTokenStorage') && configuration.CSRFTokenStorage instanceof CSRFTokenStorage ){
            this._CSRFTokenStorage = configuration.CSRFTokenStorage;
        }
        if ( configuration.hasOwnProperty('CSRFFieldName') && ( configuration.CSRFFieldName === null || ( configuration.CSRFFieldName !== '' && typeof configuration.CSRFFieldName === 'string' ) ) ){
            this._CSRFFieldName = configuration.CSRFFieldName;
        }
        if ( configuration.hasOwnProperty('CSRFHeaderName') && ( configuration.CSRFHeaderName === null || ( configuration.CSRFHeaderName !== '' && typeof configuration.CSRFHeaderName === 'string' ) ) ){
            this._CSRFHeaderName = configuration.CSRFHeaderName;
        }
        if ( configuration.hasOwnProperty('CSRFTokenTTL') && ( configuration.CSRFTokenTTL === null || ( !isNaN(configuration.CSRFTokenTTL) && configuration.CSRFTokenTTL > 0 ) ) ){
            this._CSRFTokenTTL = configuration.CSRFTokenTTL;
        }
        if ( configuration.hasOwnProperty('CSRFIDCookieName') && typeof configuration.CSRFIDCookieName === 'string' && configuration.CSRFIDCookieName !== '' ){
            this._CSRFIDCookieName = configuration.CSRFIDCookieName;
        }
        if ( configuration.hasOwnProperty('CSRFIDCookieOptions') && typeof configuration.CSRFIDCookieOptions === 'object' ){
            this._CSRFIDCookieOptions = configuration.CSRFIDCookieOptions;
        }
        return this;
    }

    /**
     * Executes the authentication layer as of defined in the given route and router the route belongs to.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @throws {ForbiddenHTTPException} If required permissions are not satisfied by currently logged in user.
     * @throws {ForbiddenHTTPException} If one or more policies reject currently logged in user.
     *
     * @async
     */
    async process(request, response){
        request.CSRFTokenVerificationStatus = request.CSRFToken = null;
        if ( request.resolvedRoute instanceof ResolvedRoute ){
            if ( request.CORSOptions instanceof CORSOptions && request.isPreflightRequest !== true && !request.CORSOptions.validate(request, response) ){
                throw new UnallowedCORSOriginHTTPException('Request not allowed according to CORS settings.', 3);
            }
            const route = request.resolvedRoute.getRoute(), router = request.resolvedRoute.getRouter();
            let withCSRFToken = false, CSRFTokenRequired = false;
            if ( route instanceof BaseRoute ){
                withCSRFToken = route.getWithCSRF();
                CSRFTokenRequired = route.getRequireCSRF();
            }
            if ( ( withCSRFToken || CSRFTokenRequired ) && this._CSRFTokenStorage !== null ){
                // Process client's CSRF token.
                await this._processCSRF(request, response, CSRFTokenRequired);
            }
            if ( route !== null ){
                const routeAuth = route.getAuth();
                // Check if authentication is required by this router or route.
                const auth = routeAuth === null && router !== null && router.getAuth() ? true : ( routeAuth === true );
                if ( auth ){
                    // Get the authenticator to use, check router first, then, if no authenticator has been defined for router, use the route's one.
                    request.authenticator = routeAuth === true || router === null ? route.getAuthenticator() : router.getAuthenticator();
                    request.authenticated = false;
                    if ( request.authenticator instanceof Authenticator ){
                        const authenticationResult = await request.authenticator.authenticateRequest(request, response);
                        if ( authenticationResult instanceof AuthenticationResult ){
                            request.authenticationResult = authenticationResult;
                            request.user = authenticationResult.getUserData();
                            // Check is route and router permissions are met.
                            if ( !AuthorizationProcessor._checkRoutePermissions(request) ){
                                throw new ForbiddenHTTPException('Permission denied.', 1);
                            }
                            // Check if policies allows this user to continue current request.
                            const valid = await AuthorizationProcessor._checkRoutePolicies(request, response);
                            if ( !valid ){
                                throw new ForbiddenHTTPException('Policy check failed.', 2);
                            }
                            request.authenticationSession = authenticationResult.getSession();
                            request.authenticationResult = authenticationResult;
                            request.authenticated = true;
                        }
                    }
                }
            }
        }
    }
}

/**
 * @constant Defines the name of the cookie that contains the CSRF token's unique ID on the client side.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(AuthorizationProcessor, 'CSRF_ID_COOKIE_NAME', {
    value: 'lala.js::csrf-id',
    enumerable: true,
    writable: false,
    configurable: true
});

/**
 * @constant Defines the name of the cookie that contains the CSRF token's unique ID on the client side.
 *
 * @type {number}
 * @default
 */
Object.defineProperty(AuthorizationProcessor, 'CSRF_DEFAULT_TTL', {
    value: 86400,
    enumerable: true,
    writable: false,
    configurable: true
});

/**
 * @constant Defines the name of the parameter that will be validated (if present) as the client provided CSRF token.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(AuthorizationProcessor, 'CSRF_DEFAULT_PARAM_NAME', {
    value: '_csrf',
    enumerable: true,
    writable: false,
    configurable: true
});

/**
 * @constant Defines the name of the HTTP header that will be validated (if present) as the client provided CSRF token.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(AuthorizationProcessor, 'CSRF_DEFAULT_HEADER_NAME', {
    value: 'X-CSRF-TOKEN',
    enumerable: true,
    writable: false,
    configurable: true
});

module.exports = AuthorizationProcessor;
