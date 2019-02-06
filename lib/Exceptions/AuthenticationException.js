'use strict';

const Exception = require('./Exception');

/**
 * An exception that should be thrown when authentication errors occur, for instance during database connection.
 */
class AuthenticationException extends Exception {
    /**
     * The class constructor.
     *
     * @param {string} message A string containing the exception error message.
     * @param {number} code An integer number representing the error code.
     * @param {*} exception An optional exception that will be chained in the exception stack trace.
     */
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = AuthenticationException;