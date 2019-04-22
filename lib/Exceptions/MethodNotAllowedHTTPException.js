'use strict';

// Including Lala's modules.
const HTTPException = require('./HTTPException');

/**
 *
 */
class MethodNotAllowedHTTPException extends HTTPException {
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

module.exports = MethodNotAllowedHTTPException;