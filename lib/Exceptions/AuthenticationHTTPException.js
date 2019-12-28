'use strict';

// Including Lala's modules.
const HTTPException = require('./HTTPException');

/**
 * An exception that should be thrown whenever an error occurs during an authentication made through the HTTP protocol.
 */
class AuthenticationHTTPException extends HTTPException {
    /**
     * The class constructor.
     *
     * @param {string} message A string containing the exception error message.
     * @param {number} code An integer number representing the error code.
     * @param {*} exception An optional exception that will be chained in the exception stack trace.
     * @param {(Authenticator|null)} [authenticator=null] An instance of the authenticator instance that thorn this exception.
     */
    constructor(message, code, exception, authenticator = null){
        super(message, code, exception);

        /**
         * @type {(Authenticator|null)} _authenticator An instance of an authenticator class, that must extend the "Authenticator" class, or null if no authenticator is available in this context.
         *
         * @private
         */
        this._authenticator = authenticator;
    }

    /**
     * Returns the authenticator that thrown this exception.
     *
     * @returns {(Authenticator|null)} An instance of the authenticator class or null if no authenticator has been defined for this context.
     */
    getAuthenticator(){
        return this._authenticator;
    }
}

module.exports = AuthenticationHTTPException;