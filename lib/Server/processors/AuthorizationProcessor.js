'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const ResolvedRoute = require('../../Routing/ResolvedRoute');
const Authenticator = require('../../Authenticator/Authenticator');
const {
    InvalidArgumentException
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
 * @typedef AuthorizationProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, middlewareHandler>} accessMiddlewares A map that contains all the defined middleware functions that allows to determinate if a request should be accepted or not.
 */

/**
 * Allows to determines if a request can be processed according to authorization and authentication settings defined.
 */
class AuthorizationProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {AuthorizationProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            accessMiddlewares: new Map()
        };
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
        }
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
     * @async
     */
    async process(request, response){
        if ( request.hasOwnProperty('resolvedRoute') && request.resolvedRoute instanceof ResolvedRoute ){
            const router = request.resolvedRoute.getRouter();
            const route = request.resolvedRoute.getRoute();
            if ( route !== null ){
                const routeAuth = route.getAuth();
                // Check if authentication is required by this router or route.
                const auth = routeAuth === null && router !== null && router.getAuth() ? true : ( routeAuth === true );
                if ( auth ){
                    // Get the authenticator to use, check router first, then, if no authenticator has been defined for router, use the route's one.
                    request.authenticator = routeAuth === true || router === null ? route.getAuthenticator() : router.getAuthenticator();
                    if ( request.hasOwnProperty('authenticator') && request.authenticator instanceof Authenticator ){
                        const authenticationResult = await request.authenticator.authenticateRequest(request);
                        if ( authenticationResult !== null ){
                            request.user = authenticationResult.getUserData();
                            request.authenticationSession = authenticationResult.getSession();
                            request.authenticationResult = authenticationResult;
                        }
                    }
                }
            }
        }
        return true;
    }
}

module.exports = AuthorizationProcessor;
