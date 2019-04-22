'use strict';

// Including Lala's modules.
const AuthenticationHTTPException = require('./AuthenticationHTTPException');

/**
 * An exception that should be thrown whenever user credentials for a requested authentication process are sent using an unsupported authentication method.
 */
class UnsupportedAuthenticationMethodHTTPException extends AuthenticationHTTPException {
    /**
     * The class constructor.
     *
     * @param {string} message A string containing the exception error message.
     * @param {number} code An integer number representing the error code.
     * @param {*} exception An optional exception that will be chained in the exception stack trace.
     * @param {(Authenticator|null)} [authenticator=null] An instance of the authenticator instance that thorn this exception.
     */
    constructor(message, code, exception, authenticator = null){
        super(message, code, exception, authenticator);
    }
}

module.exports = UnsupportedAuthenticationMethodHTTPException;