'use strict';

// Including native modules.
const crypto = require('crypto');

// Including Lala's modules.
const HTTPAuthenticator = require('./HTTPAuthenticator');
const UserSession = require('./UserSession');
const { generateToken } = require('../helpers');
const {
    InvalidArgumentException,
    AuthenticationRequiredHTTPException,
    UserNotFoundException,
    InvalidCredentialsHTTPException,
    TokenExpiredException,
    MalformedAuthenticationAttemptHTTPException,
    UnsupportedAuthenticationMethodHTTPException
} = require('../Exceptions');

/**
 * This class provide support for the digest authentication defined as of the HTTP protocol (RFC 2617).
 *
 * @see https://tools.ietf.org/html/rfc2617
 */
class DigestHTTPAuthentication extends HTTPAuthenticator {
    /**
     * Validates the content of the  "Authorization" header sent by the client being authenticated.
     * 
     * @param {{string: string}} components An object containing as key the property name and as value the corresponding value as a string.
     *
     * @throws {MalformedAuthenticationAttemptHTTPException} If some required property is missing.
     *
     * @protected
     */
    static _validateAttempt(components){
        // Define required properties client must have sent in "Authorization" HTTP header.
        const requiredProperties = ['realm', 'nonce', 'response', 'cnonce'];
        if ( components.hasOwnProperty('qop') && ( components.qop === 'auth' || components.qop === 'auth-int' ) ){
            requiredProperties.push('nc');
        }
        const length = requiredProperties.length;
        for ( let i = 0 ; i < length ; i++ ){
            const property = requiredProperties[i];
            if ( !components.hasOwnProperty(property) || typeof components[property] !== 'string' || components[property] === '' ){
                throw new MalformedAuthenticationAttemptHTTPException('Authorization headers seems to be malformed or some data is missing.', 1);
            }
        }
    }

    /**
     * Extracts all the components sent by the client contained in the "Authorization" header.
     *
     * @param {string} authorization A string containing the content of the "Authorization" header received.
     *
     * @returns {(object|null)} An object having as key the component name and as value its value, if header content is not valid os not eligible will be returned null instead.
     *
     * @protected
     */
    static _parseHeader(authorization){
        if ( authorization === '' || typeof authorization !== 'string' ){
            return null;
        }
        // Extract the header useful content ignoring the "Digest" statement.
        const content = authorization.substr(7);
        // Splits the header into key/value components.
        const blocks = content.split(', ');
        const length = blocks.length;
        let components = {};
        for ( let i = 0 ; i < length ; i++ ){
            const parts = blocks[i].split('=');
            if ( parts.length === 2 && parts[0] !== '' && parts[1].length > 2 ){
                // Validate current component in order to check if it is a valid key/value pair separated by the "=" sign.
                components[parts[0]] = parts[1].charAt(0) === '"' ? parts[1].substr(1, parts[1].length - 2) : parts[1];
            }
        }
        // Validate client sent header.
        this._validateAttempt(components);
        components.originalNonce = components.nonce;
        // Decode nonce and extract both the real nonce and the session ID that has been prepended.
        const nonceComponents = Buffer.from(components.nonce, 'base64').toString('ascii').split(':');
        if ( nonceComponents.length !== 2 || nonceComponents[0] === '' || nonceComponents[1] === '' ){
            return null;
        }
        components.sessionID = nonceComponents[0];
        components.nonce = nonceComponents[1];
        if ( components.username === '' || typeof components.username !== 'string' ){
            components.username = null;
        }
        return components;
    }

    /**
     * Generates a new authentication session containing both the user authentication object and the related token.
     *
     * @returns {Promise<UserSession>} An instance of the class "UserSession" representing the generated session including current context.
     *
     * @protected
     */
    async _generateSession(){
        const session = new UserSession();
        const sessionID = session.getID();
        // Generate a cryptographically secure token used as the nonce token for the client.
        const nonce = await generateToken(this._nonceLength);
        // Prepare the content of the nonce header as a merge of the nonce token and the session ID.
        const token = Buffer.from( sessionID + ':' + nonce).toString('base64');
        // Set the content and current session TTL.
        session.setTTL(this._authenticationSessionTTL).setPending(true).setContext({
            token: token,
            nonce: nonce,
            attemptsLeft: this._attemptsCount,
            attempts: 0,
            algorithm: 'MD5-sess'
        });
        this._tempSessions.set(sessionID, session);
        return session;
    }

    /**
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {number} _authenticationSessionTTL An integer number greater or equal than zero representing the amount of seconds authentication session will live for, if set to zero, no expire date will be applied.
         *
         * @protected
         */
        this._authenticationSessionTTL = 3600;

        /**
         * @type {(number|null)} _attemptsCount An integer number greater than zero representing the number of login attempts that can be made using a single session before invalidating it, if set to null, infinite attempts can be done.
         *
         * @protected
         */
        this._attemptsCount = 10;

        /**
         * @type {number} _nonceLength An integer number representing the size of the "nonce" token that will be sent to the client to initialize the authentication process.
         *
         * @protected
         */
        this._nonceLength = 256;

        /**
         * @type {Map<string, UserSession>} _tempSessions A map containing as key a string representing the session ID and as value an instance of the class "UserSession" representing the session itself.
         *
         * @protected
         */
        this._tempSessions = new Map();
    }

    /**
     * Sets the amount of seconds after authentication sessions will expire, this method is chainable.
     *
     * @param {number} ttl An integer number greater or equal than zero representing the amount of seconds session will live for, if set to zero, generated sessions will have no expire.
     *
     * @returns {DigestHTTPAuthentication}
     *
     * @throws {InvalidArgumentException} If an invalid TTL value is given.
     */
    setAuthenticationSessionTTL(ttl){
        if ( ttl === null || isNaN(ttl) || ttl <= 0 ){
            throw new InvalidArgumentException('Invalid TTL value.', 1);
        }
        this._authenticationSessionTTL = ttl;
        return this;
    }

    /**
     * Returns the amount of seconds this session will live for.
     *
     * @returns {number} An integer number greater or equal than zero representing the life spawn of sessions, if no expire has been defined, will be returned zero.
     */
    getAuthenticationSessionTTL(){
        return this._authenticationSessionTTL;
    }

    /**
     * Sets the number of authentication attempts that can be done until session invalidation, this method is chainable.
     *
     * @param {number} attempts An integer number greater or equal than zero representing the number of possible attempts, pass zero to allow unlimited number of attempts.
     *
     * @returns {DigestHTTPAuthentication}
     *
     * @throws {InvalidArgumentException} If an invalid number is given.
     */
    setAttemptsCount(attempts){
        if ( attempts === null || isNaN(attempts) || attempts <= 0 ){
            throw new InvalidArgumentException('Invalid attempts count.', 1);
        }
        this._attemptsCount = attempts;
        return this;
    }

    /**
     * Returns the number of possible authentication attempts that can be made before invalidating current user session.
     *
     * @returns {number} An integer number greater or equal than zero representing the amount or zero if unlimited attempts are allowed.
     */
    getAttemptsCount(){
        return this._attemptsCount;
    }

    /**
     * Sets the length of the "nonce" token to generate in authentication initialization, this method is chainable.
     *
     * @param {number} length An integer number greater than zero representing the token length.
     *
     * @returns {DigestHTTPAuthentication}
     */
    setNonceLength(length){
        if ( length === null || isNaN(length) || length <= 0 ){
            throw new InvalidArgumentException('Invalid length.', 1);
        }
        this._nonceLength = length;
        return this;
    }

    /**
     * Returns the defined length used in "cnonce" token generation.
     *
     * @returns {number} An integer number greater than zero representing the token length.
     */
    getNonceLength(){
        return this._nonceLength;
    }

    /**
     * Drops all currently active authentication sessions, this method is chainable.
     *
     * @returns {DigestHTTPAuthentication}
     */
    dropPendingSessions(){
        this._tempSessions = new Map();
        return this;
    }

    /**
     * Generates the hash string to be compared to the one sent by the client being authenticated.
     *
     * @param {object} context An object containing current authentication properties such as nonce token and algorithm in use.
     * @param {object} components An object containing all the properties sent over the "Authorization" HTTP header.
     * @param {Credentials} credentials An instance of the class "Credentials" representing the user credentials found.
     * @param {object} request An object representing the client request and containing all the connection properties.
     *
     * @returns {Buffer} An instance of the class "Buffer" representing the generated MD5 hash.
     *
     * @protected
     */
    _buildAuthDigest(context, components, credentials, request){
        let cocktail, HA1, HA2;
        const password = credentials.getPassword();
        // Prepare client provided components.
        const cnonce = components.hasOwnProperty('cnonce') ? components.cnonce : '';
        const qop = components.hasOwnProperty('qop') ? components.qop : '';
        // Prepare the hash string to compare to the client's one according to the RCF 2617 specification.
        if ( context.algorithm === 'MD5-sess' ){
            cocktail = components.username + ':' + this.getRealm() + ':' + password;
            HA1 = crypto.createHash('md5').update(cocktail).digest();
            cocktail = HA1.toString('hex') + ':' + context.token + ':' + cnonce;
        }else{
            cocktail = components.username + ':' + this.getRealm() + ':' + password;
        }
        HA1 = crypto.createHash('md5').update(cocktail).digest();
        if ( qop === 'auth-int' ){
            // TODO: Add support for "auth-int" qop.
        }else{
            cocktail = request.method + ':' + request.url;
        }
        HA2 = crypto.createHash('md5').update(cocktail).digest();
        if ( qop === 'auth-int' || qop === 'auth' ){
            cocktail = HA1.toString('hex') + ':' + context.token + ':' + components.nc + ':' + cnonce + ':' + qop + ':' + HA2.toString('hex');
        }else{
            cocktail = HA1.toString('hex') + ':' + context.token + ':' + HA2.toString('hex');
        }
        return crypto.createHash('md5').update(cocktail).digest();
    }

    /**
     * Authenticates the user comparing credentials sent with all the defined ones according to the Digest Auth protocol.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     *
     * @returns {Promise<{user: object, session: UserSession}>} An object containing both the authenticated user and its session.
     *
     * @throws {AuthenticationRequiredHTTPException} If no authorization token has been sent.
     * @throws {UnsupportedAuthenticationMethodHTTPException} If the authentication method requested is not supported by this authenticator.
     * @throws {UserNotFoundException} If no user matching the username specified has been found.
     * @throws {TokenExpiredException} If client token has expired or removed.
     * @throws {InvalidCredentialsHTTPException} If credentials sent doesn't match user found's ones.
     *
     * @async
     * @override
     */
    async authenticateRequest(request){
        const components = request.headers.hasOwnProperty('authorization') ? DigestHTTPAuthentication._parseHeader(request.headers.authorization) : null;
        if ( components === null || components.username === null ){
            throw new AuthenticationRequiredHTTPException('Authentication required.', 1, null);
        }
        if ( request.authMethod !== 'digest' ){
            throw new UnsupportedAuthenticationMethodHTTPException('Unsupported authentication method, please use the Digest method.', 2);
        }
        // Look up user credentials based on this username.
        const credentials = await this._lookupCredentials(components.username);
        if ( credentials === null ){
            this._emitRejectionEvent('UserNotFound', components.username);
            throw new UserNotFoundException('No such username found.', 3);
        }
        const sessionID = components.sessionID;
        // Get the session based on the ID sent by client under authentication.
        const session = this._tempSessions.get(sessionID);
        if ( typeof session === 'undefined' || session.expire < ( new Date() ) || session.attemptsLeft <= 0 ){
            this._emitRejectionEvent('AuthenticationRejected', components.username);
            throw new TokenExpiredException('The given nonce token has expired.', 4);
        }
        // Get the context associated to this client session.
        const context = session.getContext();
        // Scale off one of the available attempts.
        context.attempts++;
        context.attemptsLeft--;
        // Generate the digest string to compare with client provided one.
        const digest = this._buildAuthDigest(context, components, credentials, request);
        const response = Buffer.from(components.response, 'hex');
        // Compare hashes in secure way.
        if ( !crypto.timingSafeEqual(digest, response) ){
            this._emitRejectionEvent('InvalidCredentials', components.username);
            throw new InvalidCredentialsHTTPException('Wrong credentials.', 5);
        }
        // Reset attempts count.
        context.attempts = 0;
        context.attemptsLeft = this._attemptsCount;
        // Get a proper user representation based on a user defined function, it should fetch the user based on its credentials.
        const userObject = await this._lookupUserFromCredentials(credentials);
        // Get the user identifier according to user's final object representation.
        const identifier = userObject !== null ? userObject.identifier : components.username;
        // As no user has been found, create a fallback user representation that will be set as the "user" property in the request object.
        const user = userObject === null ? {
            identifier: identifier
        } : userObject.user;
        // Add the user to its session, confirm it and then add it to the list of all the sessions of this user.
        // TODO: Add support for client object, an object representing client properties (IP, geolocation, browser, UA, OS, and so on) should be added to this session.
        session.setUser(user).setPending(false).setContext(null).register();
        this._addUserSession(identifier, session, userObject);
        this._tempSessions.delete(sessionID);
        this.emit('authentication', {
            user: user,
            identifier: identifier
        });
        return {
            user: user,
            session: session
        };
    }

    /**
     * Informs the client that it must provide valid authentication credentials using the basic HTT authentication mechanism.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @override
     */
    async requestAuthentication(request, response){
        const now = new Date();
        let stale = false, session = null;
        // Get the content of the "authorization" header sent by client for authentication.
        const authComponents = request.headers.hasOwnProperty('authorization') ? DigestHTTPAuthentication._parseHeader(request.headers.authorization) : null;
        if ( authComponents !== null ){
            // Check and get the confirmed session based on its ID.
            session = this._getSession(authComponents.sessionID);
            if ( session === null ){
                // No confirmed session found, Get the temp session (under authentication process) matching the client provided session ID.
                session = this._tempSessions.get(authComponents.sessionID);
                let generated = false;
                if ( typeof session === 'undefined' ){
                    // If no session matching this ID is found, generate a new one and inform the client to reset the authentication process using the "stale" directive.
                    session = await this._generateSession();
                    stale = generated = true;
                }
                if ( !generated ){
                    const context = session.getContext();
                    if ( authComponents.nonce !== context.nonce || context.attemptsLeft <= 0 || context.expire < now ){
                        // TODO: if too many auth attempts are made ( context.attemptsLeft === 0 ) implement a temp ban system (err. 429) for a defined amount of time, then generate a new session once client will be allowed again.
                        session = await this._generateSession();
                        stale = true;
                    }
                }
            }else{
                session.updateLastSeen();
            }
        }else{
            // No "authorization" header found, generating a session and starting the authentication process.
            session = await this._generateSession();
            stale = true;
        }
        const sessionID = session.getID();
        const context = session.getContext();
        const nc = parseInt(context.attempts, 16);
        const opaque = Buffer.from(sessionID).toString('base64');
        // Build the authentication header.
        let header = 'Digest realm="' + this.getRealm() + '", qop="auth", nc=' + nc + ', opaque="' + opaque + '", nonce="' + context.token + '", charset="' + this._charset + '" algorithm="' + context.algorithm + '"';
        if ( stale ){
            header += ', stale="TRUE"';
        }
        response.setHeader('WWW-Authenticate', header);
        // TODO: Add a client representation to this event, it should contain client information such as the IP, geolocation, browser, UA, OS, and so on.
        this.emit('authenticationRequest');
    }
}

module.exports = DigestHTTPAuthentication;
