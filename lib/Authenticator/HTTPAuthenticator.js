'use strict';

// Including Lala's modules.
const Authenticator = require('./Authenticator');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../Exceptions');

/**
 * This class provides a common stating point for standard authentication mechanisms used over the HTTP protocol.
 *
 * @abstract
 */
class HTTPAuthenticator extends Authenticator {
    /**
     * Emits an error event.
     *
     * @param {string} reason A string containing the error cause.
     * @param {string} identifier A string representing the user's unique identifier.
     *
     * @protected
     */
    _emitRejectionEvent(reason, identifier){
        this.emit('authenticationRejected', {
            reason: reason,
            userIdentifier: identifier
        });
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        /**
         * @type {(string|null)} _realm A string containing the message to show to the client in the authentication dialog provided by the browser.
         *
         * @protected
         */
        this._realm = 'You\'re entering a secret place, soo, who are you?';

        /**
         * @type {string} _charset A string containing the name of the encoding that the credentials should be encoded and sent in.
         *
         * @protected
         */
        this._charset = 'utf-8';

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'HTTPAuthenticator' ) {
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Sets the message to show in the authentication dialog displayed by the browser, this method is chainable.
     *
     * @param {(string|null)} realm A string containing the message to show, if set to null, browser's default message will be displayed instead.
     *
     * @returns {HTTPAuthenticator}
     *
     * @throws {InvalidArgumentException} If an invalid message is given.
     */
    setRealm(realm){
        if ( typeof realm !== 'string' ){
            throw new InvalidArgumentException('Invalid realm.', 1);
        }
        this._realm = realm === '' ? 'You\'re entering a secret place, soo, who are you?' : realm;
        return this;
    }

    /**
     * Returns the message to show in the authentication dialog displayed by the browser.
     *
     * @returns {(string|null)} A string containing the message or null if no custom message has been defined.
     */
    getRealm(){
        return this._realm;
    }

    /**
     * Sets the name of encoding that the user credentials should be sent in, this method is chainable.
     *
     * @param {string} charset A string containing the encoding name, by default "utf-8" is used.
     *
     * @returns {HTTPAuthenticator}
     *
     * @throws {InvalidArgumentException} If an invalid encoding name is given.
     */
    setCharset(charset){
        if ( charset === '' || typeof charset !== 'string' ){
            throw new InvalidArgumentException('Invalid charset.', 1);
        }
        this._charset = charset;
        return this;
    }

    /**
     * Returns the name of encoding that the user credentials should be sent in.
     *
     * @returns {string} A string containing the encoding name.
     */
    getCharset(){
        return this._charset;
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
     * @override
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
     * @override
     */
    async requestAuthentication(request, response){}
}

module.exports = HTTPAuthenticator;
