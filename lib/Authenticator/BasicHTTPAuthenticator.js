'use strict';

// Including native modules.
const crypto = require('crypto');

// Including Lala's modules.
const HTTPAuthenticator = require('./HTTPAuthenticator');
const AuthenticationResult = require('./AuthenticationResult');
const {
    InvalidArgumentException,
    NotFoundException,
    AuthenticationRequiredHTTPException,
    UnsupportedAuthenticationMethodHTTPException,
    InvalidCredentialsHTTPException
} = require('../Exceptions');

/**
 * This class provide support for the basic authentication defined as of the HTTP protocol (RFC 7617).
 *
 * @see https://tools.ietf.org/html/rfc7617
 */
class BasicHTTPAuthenticator extends HTTPAuthenticator {
    /**
     * The class constructor.
     */
    constructor() {
        super();
    }

    /**
     * Checks if a given password matches with the password associated to the given username.
     *
     * @param {string} identifier A string representing the unique user identifier to look up.
     * @param {string} password A string representing the password to compare.
     *
     * @returns {Promise<?AuthenticationResult>} An object representing the user found or null if given password is not correct.
     *
     * @throws {InvalidArgumentException} If an invalid username is given.
     * @throws {InvalidArgumentException} If an invalid password is given.
     * @throws {NotFoundException} If no user matching the given username is found.
     *
     * @async
     * @override
     */
    async validate(identifier, password){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid username.', 1);
        }
        if ( password === '' || typeof password !== 'string' ){
            throw new InvalidArgumentException('Invalid password.', 2);
        }
        // Look up user credentials based on this username.
        const credentials = await this._lookupCredentials(identifier);
        if ( credentials === null ){
            this._emitRejectionEvent('UserNotFound', identifier);
            throw new NotFoundException('No such username found.', 3);
        }
        // Generate a SHA-256 hash representation from credentials to compare in order to ensure them to have the same length.
        const passwordDigest = crypto.createHash('sha256').update(password).digest();
        const validPasswordDigest = crypto.createHash('sha256').update(credentials.getPassword()).digest();
        let user = null;
        // Compare given password with the password found preventing timing attacks.
        if ( crypto.timingSafeEqual(passwordDigest, validPasswordDigest) ){
            // Get a proper user representation based on a user defined function, it should fetch the user based on its credentials.
            const userObject = await this._lookupUserFromCredentials(credentials);
            user = userObject === null ? new AuthenticationResult(identifier) : new AuthenticationResult(userObject.identifier, {
                userData: userObject.user
            });
        }
        return user;
    }

    /**
     * Authenticates the user comparing credentials sent in the HTTP request with all the defined credentials.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {Promise<?AuthenticationResult>} An object containing user information such as its username and the custom user properties defined, namely "userData".
     *
     * @throws {AuthenticationRequiredHTTPException} If user credentials were not found.
     * @throws {UnsupportedAuthenticationMethodHTTPException} If the authentication method requested is not supported by this authenticator.
     * @throws {InvalidCredentialsHTTPException} If user credentials found are not valid according user credentials defined, such as wrong password or user not found.
     *
     * @async
     * @override
     */
    async authenticateRequest(request){
        if ( !request.hasOwnProperty('credentials') ){
            throw new AuthenticationRequiredHTTPException('Authentication required.', 1);
        }
        if ( request.credentials === null || request.credentials.username === '' || typeof request.credentials.username !== 'string' ){
            throw new AuthenticationRequiredHTTPException('Authentication required.', 1);
        }
        if ( request.credentials.password === '' || typeof request.credentials.password !== 'string' ){
            throw new AuthenticationRequiredHTTPException('Authentication required.', 1);
        }
        if ( !request.hasOwnProperty('authMethod') || request.authMethod !== 'basic' ){
            throw new UnsupportedAuthenticationMethodHTTPException('Unsupported authentication method, please use the Basic method.', 2);
        }
        // Check if this user exists and if its password is correct.
        const user = await this.validate(request.credentials.username, request.credentials.password);
        if ( user === null ){
            this._emitRejectionEvent('InvalidCredentials', request.credentials.username);
            throw new InvalidCredentialsHTTPException('Wrong credentials.', 3);
        }
        this.emit('authentication', user);
        return user;
    }

    /**
     * Informs the client that it must provide valid authentication credentials using the digest HTT authentication mechanism.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async requestAuthentication(request, response){
        if ( !response.headersSent ){
            const header = 'Basic realm="' + this.getRealm() + '", charset="' + this._charset + '"';
            response.setHeader('WWW-Authenticate', header);
            // TODO: Add a client representation to this event, it should contain client information such as the IP, geolocation, browser, UA, OS, and so on.
        }
        this.emit('authenticationRequest');
    }
}

module.exports = BasicHTTPAuthenticator;
