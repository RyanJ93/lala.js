'use strict';

// Including Lala's modules.
const Exception = require('./Exception');

/**
 * An exception that should be thrown when the requested resource cannot be returned to the client due to imposed restrictions, namely, the 403 HTTP error.
 */
class ForbiddenHttpException extends Exception {
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

module.exports = ForbiddenHttpException;
