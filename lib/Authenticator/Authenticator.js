'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const AuthenticatedUser = require('./AuthenticatedUser');
const UserSession = require('./UserSession');
const {
    CallbackBasedCredentialsProvider,
    RepositoryBasedCredentialsProvider
} = require('./credentialsProviders');
const Credentials = require('../Types/Credentials');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @callback getCredentials The callback function invoked to lookup credentials from an unique user identifier.
 *
 * @param {string} identifier A string representing the unique identifier of the user to lookup.
 *
 * @returns {Promise<*>} The credentials found.
 *
 * @async
 */

/**
 * @callback userAuthenticationCallback The callback used to authenticate an user in a custom way.
 *
 * @param {string} username A string containing the username or another kind of user identifier.
 * @param {string} password The user password without any encryption layer.
 *
 * @return {Promise<boolean>} If provided credentials are valid should be returned "true", otherwise "false".
 *
 * @async
 */

/**
 * @callback userLookupCallback The callback that allow to provide a proper user representation for the authenticated user.
 *
 * @param {string} identifier A string containing the user unique identifier, as of the defined property name.
 *
 * @return {Promise<*>} A representation of the user, usually an object, such as a model/class instance.
 *
 * @async
 */

/**
 * @typedef UserPlaceholder An object containing a custom representation provided by an unique user identifier.
 *
 * @property {string} identifier A string containing an unique identifier used to lookup an user.
 * @property {*} Some custom data that represent the user found, usually an object representation of the user.
 */

/**
 * The base class for user authentication, it defines the required standard accepted by request processors.
 *
 * @abstract
 */
class Authenticator extends EventEmitter {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor() {
        super();

        /**
         * @type {?CredentialsProvider} _credentialsProvider An instance of a class extending the "CredentialsProvider" class representing the provider
         *
         * @protected
         */
        this._credentialsProvider = null;

        /**
         * @type {Map<string, AuthenticatedUser>} _authenticatedUsers A map containing all the authenticated users having as key the user ID and as value an object representing the authenticated user and its active sessions.
         *
         * @protected
         */
        this._authenticatedUsers = new Map();

        /**
         * @type {(userAuthenticationCallback|null)} _userAuthenticationFunction A callback function invoked whenever a login occurs in order to check user credentials using custom methods.
         *
         * @protected
         */
        this._userAuthenticationFunction = null;

        /**
         * @type {(userLookupCallback|null)} _userLookupFunction A callback function invoked in order to allow to provide to the authenticator an user object given its ID, as of the defined property name.
         *
         * @protected
         */
        this._userLookupFunction = null;

        /**
         * @type {string} _IDPropertyName A string containing the name of the property that contains the user ID to lookup in the object returned by the custom user lookup function defined, by default, "id" is used.
         *
         * @protected
         */
        this._IDPropertyName = 'id';

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Authenticator' ) {
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Sets the user credentials accepted by this authenticator, this method is chainable.
     *
     * @param {?Map<string, (string|object|Credentials)>} credentials A map containing the credentials and having as key the user unique identifier and as value the user password.
     *
     * @returns {Authenticator}
     */
    setCredentials(credentials){
        if ( !( this._credentialsProvider instanceof RepositoryBasedCredentialsProvider ) ){
            this._credentialsProvider = new RepositoryBasedCredentialsProvider();
        }
        this._credentialsProvider.setCredentials(credentials);
        return this;
    }

    /**
     * Sets the accepted user credentials from a given standard object, this method is chainable.
     *
     * @param {({identifier: string}|{identifier: {password: string, userData: *}})} credentials An object having as key the user identifier and as value its password as a string or an object containing both the password and some custom user data.
     *
     * @returns {Authenticator}
     */
    setCredentialsAsObject(credentials){
        if ( !( this._credentialsProvider instanceof RepositoryBasedCredentialsProvider ) ){
            this._credentialsProvider = new RepositoryBasedCredentialsProvider();
        }
        this._credentialsProvider.setCredentialsAsObject(credentials);
        return this;
    }

    /**
     * Sets the path to the file where accepted credentials are stored, this method is chainable.
     *
     * @param path A string containing the path to the JSON file.
     * @param preload If set to "true"
     *
     * @returns {Authenticator}
     */
    setCredentialsFile(path, preload = false){
        if ( !( this._credentialsProvider instanceof RepositoryBasedCredentialsProvider ) ){
            this._credentialsProvider = new RepositoryBasedCredentialsProvider();
        }
        this._credentialsProvider.setCredentialsFile(path);
        return this;
    }

    /**
     * Sets the callback function to invoke in order to fetch credentials for an user given its unique identifier, this method is chainable.
     *
     * @param {getCredentials} callback The callback function that will be invoked to lookup user credentials by its unique identifier.
     *
     * @returns {Authenticator}
     */
    setCredentialsCallback(callback){
        if ( !( this._credentialsProvider instanceof CallbackBasedCredentialsProvider ) ){
            this._credentialsProvider = new CallbackBasedCredentialsProvider();
        }
        this._credentialsProvider.setCallback(callback);
        return this;
    }

    /**
     * Sets the provider where user credentials should be obtained from, this method is chainable.
     *
     * @param {CredentialsProvider} provider An instance of the provider class, it must extend the "CredentialsProvider" abstract class.
     *
     * @returns {Authenticator}
     */
    setCredentialsProvider(provider){
        // TODO: Add validation for provider.
        this._credentialsProvider = provider;
        return this;
    }

    /**
     * Returns the provider used to lookup user credentials.
     *
     * @returns {?CredentialsProvider} An instance of the provider class or null if no provider has been defined nor generated.
     */
    getCredentialsProvider(){
        return this._credentialsProvider;
    }

    /**
     * Looks up user credentials based on a given unique user identifier.
     *
     * @param {string} identifier A string containing the user's unique identifier.
     *
     * @returns {Promise<?Credentials>} An object containing the credentials found, usually in
     *
     * @async
     * @protected
     */
    async _lookupCredentials(identifier){
        let credentials = null;
        if ( this._credentialsProvider !== null ){
            // Look up user credentials using the defined/generated provider.
            credentials = await this._credentialsProvider.lookup(identifier);
        }
        return credentials;
    }

    /**
     * Sets the custom function to call whenever an authentication occurs allowing to use custom credentials check methods, this method is chainable.
     *
     * @param {(userAuthenticationCallback|null)} callback A callback function or null if no custom authentication function should be used, functions should return a boolean, exceptions will be considered as failures.
     *
     * @returns {Authenticator}
     *
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    setUserAuthenticationFunction(callback){
        if ( callback !== null && typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        this._userAuthenticationFunction = callback;
        return this;
    }

    /**
     * Returns the callback function that has been defined in order to provide custom credentials check.
     *
     * @returns {(userAuthenticationCallback|null)} The custom function defined or null if no callback has been defined.
     */
    getUserAuthenticationFunction(){
        return this._userAuthenticationFunction;
    }

    /**
     * Sets the function to call in order to get a proper user representation when an authentication process ends based on the user ID, as of the defined property name, this method is chainable.
     *
     * @param {(userLookupCallback|null)} callback A callback function or null, functions should return an object representation of the user.
     *
     * @returns {Authenticator}
     *
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    setUserLookupFunction(callback){
        if ( callback !== null && typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        this._userLookupFunction = callback;
        return this;
    }

    /**
     * Returns the function that has been defined in order to get a proper representation of the authenticated user.
     *
     * @returns {(userLookupCallback|null)} The callback function or null if no callback function has been defined.
     */
    getUserLookupFunction(){
        return this._userLookupFunction;
    }

    /**
     * Sets the name of the property to lookup in the user object return by the custom user lookup function in order to get the user unique identifier, this method is chainable.
     *
     * @param {string} property A string containing the property name.
     *
     * @returns {Authenticator}
     *
     * @throws {InvalidArgumentException} If the given property name if not valid.
     */
    setIDPropertyName(property){
        if ( property === '' || typeof property !== 'string' ){
            throw new InvalidArgumentException('Invalid property name.', 1);
        }
        this._IDPropertyName = property;
        return this;
    }

    /**
     * Returns the name of the property that contains the user unique identifier within the user object returned by the custom user lookup function.
     *
     * @returns {string} A string containing the property name, by default "id".
     */
    getIDPropertyName(){
        return this._IDPropertyName;
    }

    /**
     * Returns all currently authenticated users.
     *
     * @returns {object[]} A sequential array containing all the users represented as objects.
     */
    getAuthenticatedUsers(){
        const users = [];
        for ( const authenticatedUser of this._authenticatedUsers ){
            const user = authenticatedUser.getUser();
            if ( user !== null ){
                users.push(user);
            }
        }
        return users;
    }

    /**
     * Checks if an user is authenticated by a given user identifier.
     *
     * @param {string} identifier A string containing the user's unique identifier, usually its ID.
     *
     * @returns {boolean} If the given user has at least one active session will be returned "true", otherwise "false".
     */
    isAuthenticated(identifier){
        const user = this._authenticatedUsers.get(identifier);
        return typeof user !== 'undefined' && user.authenticated();
    }

    /**
     * Returns all the active sessions for a given user.
     *
     * @param {string} identifier A string containing the user's unique identifier, usually its ID.
     *
     * @returns {UserSession[]} A sequential array containing all the user sessions represented as instances of the class "UserSession".
     */
    getAuthSessions(identifier){
        const user = this._authenticatedUsers.get(identifier);
        return typeof user === 'undefined' ? [] : user.getAllSessions();
    }

    /**
     * Adds a session to the list of all the active session for the given user.
     *
     * @param {string} identifier A string containing the unique user identifier.
     * @param {UserSession} session An instance of the class "UserSession" representing the authenticated user session.
     * @param {*} user An optional user representation, typically an object.
     *
     * @protected
     */
    _addUserSession(identifier, session, user = null){
        if ( !this._authenticatedUsers.has(identifier) ){
            // Create the object representing the given user, it will contains all further sessions for this user.
            const authenticatedUser = new AuthenticatedUser();
            if ( user !== null && typeof user === 'object' ){
                authenticatedUser.setUser(user);
            }
            this._authenticatedUsers.set(identifier, authenticatedUser);
        }
        this._authenticatedUsers.get(identifier).addSession(session);
    }

    /**
     * Returns a session given its ID.
     *
     * @param sessionID A string representing the unique session ID, usually an UUID version 4.
     *
     * @returns {?UserSession} An instance of the class "UserSession" representing the session found or null if no session matching the given ID is found.
     *
     * @protected
     */
    _getSession(sessionID){
        return UserSession.getUserSession(sessionID);
    }

    /**
     * Looks up an user by a given identifier.
     *
     * @param {string} identifier A string containing the user unique identifier to use in user look up.
     *
     * @returns {Promise<?UserPlaceholder>} An object containing the custom data provided for user matching given identiifer.
     *
     * @throws {RuntimeException} If custom callback function throws an exception.
     *
     * @async
     * @protected
     */
    async _lookupUser(identifier){
        let userObject = null;
        if ( typeof this._userLookupFunction === 'function' ){
            // Get the proper user representation from to defined callback function (async functions must be allowed).
            try{
                const user = await this._userLookupFunction(identifier);
                if ( user !== null ){
                    // TODO: Add support for model objects.
                    // Get the identifier from the returned object reading it from the property that has been declared as user identifier.
                    identifier = typeof user === 'object' && user.hasOwnProperty(this._IDPropertyName) ? user[this._IDPropertyName] : identifier;
                    userObject = {
                        user: user,
                        identifier: identifier
                    };
                }
            }catch(ex){
                throw new RuntimeException('An error occurred while looking up this user.', 1, ex);
            }
        }
        return userObject;
    }

    /**
     * Looks up an user by its credentials.
     *
     * @param {Credentials} credentials An instance of the class "Credentials" representing user credentials and containing the unique user identifier.
     *
     * @returns {Promise<?UserPlaceholder>} An object containing the custom data provided for user defined in credentials given.
     *
     * @async
     * @protected
     */
    async _lookupUserFromCredentials(credentials){
        const identifier = credentials.getUserID();
        let user = {
            user: credentials.getUserData(),
            identifier: identifier
        };
        if ( user.user === null ){
            // Given credentials don't contain any valid user representation, using a custom function, if defined.
            user = await this._lookupUser(identifier);
        }
        return user;
    }

    /**
     * Checks if user credentials has been sent in the request and then validates them, this method should be overwritten and implemented.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {Promise<*>} User data should be returned is credentials found are valid.
     *
     * @abstract
     * @async
     */
    async authenticateRequest(request){}

    /**
     * Tells to the client that in order to complete current request, it must provide authentication information, this method should be overwritten and implemented.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @abstract
     * @async
     */
    async requestAuthentication(request, response){}
}

module.exports = Authenticator;
