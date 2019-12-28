'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const ResolvedRoute = require('../../Routing/ResolvedRoute');
const Route = require('../../Routing/Route');
const PermissionPolicyRegistry = require('../../Routing/PermissionPolicyRegistry');
const Authenticator = require('../../Authenticator/Authenticator');
const CSRFTokenStorage = require('../support/CSRFTokenStorage');
const {
    InvalidArgumentException,
    ForbiddenHTTPException
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
 * @property {Map<string, middlewareHandler>} accessMiddlewares A map that contains all the defined middleware functions that allows to determinate if a request should be accepted or not.
 * @property {?CSRFTokenStorage} CSRFTokenStorage An instance of the class "CSRFTokenStorage" used to store clients' CSRF tokens.
 * @property {?string} [CSRFFieldName="_csrf"] A string containing the name of the POST field that, if present, should be validated as the client's CSRF token.
 * @property {?number} [CSRFTokenTTL=86400] An integer number greater than zero representing the amount of seconds this token should live for, if null, this token will last forever.
 */

/**
 * Allows to determines if a request can be processed according to authorization and authentication settings defined.
 */
class AuthorizationProcessor extends Processor {
    /**
     * Compares a set of permissions to the user assigned permissions.
     *
     * @param {(BaseRoute|Route)} entity The object whose permissions will be processed, typically an instance of the "Route" class or a route.
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
            accessMiddlewares: new Map(),
            CSRFTokenStorage: new CSRFTokenStorage(),
            CSRFFieldName: '_csrf',
            CSRFDefaultTTL: AuthorizationProcessor.CSRF_DEFAULT_TTL
        };
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
     *
     * @async
     * @protected
     */
    async _processCSRF(request, response, CSRFTokenRequired){
        request.CSRFToken = request.CSRFTokenVerificationStatus = null;
        if ( request.hasOwnProperty('cookies') && request.cookies instanceof Map ){
            // Extract the cookie that contains the ID of the CSRF token that has been assigned to this client.
            const clientToken = request.cookies.get(AuthorizationProcessor.CSRF_ID_COOKIE_NAME);
            const clientTokenID = typeof clientToken === 'undefined' ? null : clientToken.getValue();
            // Extract the CSRF token from the storage according to the unique ID extracted from client cookies.
            request.CSRFToken = clientTokenID === null ? null : this._CSRFTokenStorage.get(clientTokenID);
            if ( request.CSRFToken !== null ){
                // A valid and existing token ID has been found, check is a token value has been sent by the client.
                if ( this._CSRFFieldName !== null && typeof request.params === 'object' ){
                    let tokenValue = request.params[this._CSRFFieldName];
                    if ( tokenValue === '' || typeof tokenValue !== 'string' ){
                        // CSRF token not found in HTTP body, get it from request query parameters.
                        tokenValue = typeof request.params === 'object' ? request.query[this._CSRFFieldName] : '';
                    }
                    // Check if a token has been sent then compare it to the assigned one.
                    if ( tokenValue !== '' && typeof tokenValue === 'string' ){
                        request.CSRFTokenVerificationStatus = this._CSRFTokenStorage.verify(clientTokenID, tokenValue);
                        if ( !request.CSRFTokenVerificationStatus ){
                            throw new ForbiddenHTTPException('CSRF token mismatch.', 1);
                        }
                    }else if ( CSRFTokenRequired === true ){
                        throw new ForbiddenHTTPException('CSRF token mismatch.', 1);
                    }
                }
            }else{
                // No valid or existing token has been found for this client, a new CSRF will be created and assigned.
                request.CSRFToken = await this._CSRFTokenStorage.create(this._CSRFTokenTTL);
                // Save the created token's ID as a cookie on the client side.
                response.setCookie(AuthorizationProcessor.CSRF_ID_COOKIE_NAME, request.CSRFToken.id, {
                    HTTPOnly: true,
                    secure: request.secure
                });
            }
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
         * @type {Map<string, middlewareHandler>} _accessMiddlewares A map containing all the middlewares that will be executed in order to check if a request can be processed or if it should be blocked.
         *
         * @protected
         */
        this._accessMiddlewares = new Map();

        /**
         * @type {?CSRFTokenStorage} _CSRFTokenStorage An instance of the class "CSRFTokenStorage" used to store clients' CSRF tokens.
         *
         * @protected
         */
        this._CSRFTokenStorage = new CSRFTokenStorage();

        /**
         * @type {?string} [_CSRFFieldName="_csrf"] A string containing the name of the POST field that, if present, should be validated as the client's CSRF token.
         *
         * @protected
         */
        this._CSRFFieldName = '_csrf';

        /**
         * @type {?number} [_CSRFTokenTTL=86400] An integer number greater than zero representing the amount of seconds this token should live for, if null, this token will last forever.
         *
         * @protected
         */
        this._CSRFTokenTTL = AuthorizationProcessor.CSRF_DEFAULT_TTL;

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
        if ( configuration.hasOwnProperty('accessMiddlewares') && configuration.accessMiddlewares instanceof Map ){
            this._accessMiddlewares = configuration.accessMiddlewares;
        }
        if ( configuration.hasOwnProperty('CSRFTokenStorage') && configuration.CSRFTokenStorage instanceof CSRFTokenStorage ){
            this._CSRFTokenStorage = configuration.CSRFTokenStorage;
        }
        if ( configuration.hasOwnProperty('CSRFFieldName') && ( configuration.CSRFFieldName === null || ( configuration.CSRFFieldName !== '' && typeof configuration.CSRFFieldName === 'string' ) ) ){
            this._CSRFFieldName = configuration.CSRFFieldName;
        }
        if ( configuration.hasOwnProperty('CSRFTokenTTL') && ( configuration.CSRFTokenTTL === null || ( !isNaN(configuration.CSRFTokenTTL) && configuration.CSRFTokenTTL > 0 ) ) ){
            this._CSRFTokenTTL = configuration.CSRFTokenTTL;
        }
        return this;
    }

    /**
     * Executes the middleware functions that hve been defined in order to find out if current request should be rejected or not.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<boolean>} If current request should be rejected according to executed middleware functions will be returned "false".
     *
     * @async
     */
    async runAccessMiddlewares(request, response){
        // Get all the middlewares as an array of functions.
        const functions = Array.from(this._accessMiddlewares.values());
        const length = functions.length;
        let pointer = 0;
        // Prepare the function that allow other middlewares to be executed is current request should continue.
        const next = async () => {
            pointer++;
            // Pick the first next function available.
            while ( pointer < length && typeof functions[pointer] !== 'function' ){
                pointer++;
            }
            if ( pointer < length ){
                await functions[pointer](request, response, next);
            }
        };
        // Get the first available function.
        while ( pointer < length && typeof functions[pointer] !== 'function' ){
            pointer++;
        }
        if ( pointer < length ){
            await functions[pointer](request, response, next);
        }
        return length <= pointer;
    }

    /**
     * Executes the authentication layer as of defined in the given route and router the route belongs to.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If authentication layer passes will be returned "true", otherwise "false" and current request should be rejected.
     *
     * @throws {ForbiddenHTTPException} If required permissions are not satisfied by currently logged in user.
     * @throws {ForbiddenHTTPException} If one or more policies reject currently logged in user.
     *
     * @async
     */
    async process(request, response){
        const route = request.resolvedRoute.getRoute();
        const CSRFTokenRequired = route instanceof Route && route.getCSRFTokenRequired();
        // Process client's CSRF token.
        const processCSRFPromise = this._CSRFTokenStorage === null ? null : this._processCSRF(request, response, CSRFTokenRequired);
        if ( request.hasOwnProperty('resolvedRoute') && request.resolvedRoute instanceof ResolvedRoute ){
            const router = request.resolvedRoute.getRouter();
            if ( route !== null ){
                const routeAuth = route.getAuth();
                // Check if authentication is required by this router or route.
                const auth = routeAuth === null && router !== null && router.getAuth() ? true : ( routeAuth === true );
                if ( auth ){
                    // Get the authenticator to use, check router first, then, if no authenticator has been defined for router, use the route's one.
                    request.authenticator = routeAuth === true || router === null ? route.getAuthenticator() : router.getAuthenticator();
                    if ( request.hasOwnProperty('authenticator') && request.authenticator instanceof Authenticator ){
                        const authenticationResult = await request.authenticator.authenticateRequest(request, response);
                        if ( authenticationResult !== null ){
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
                        }
                    }
                }
            }
        }
        if ( processCSRFPromise !== null ){
            await processCSRFPromise;
        }
        return true;
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

module.exports = AuthorizationProcessor;
