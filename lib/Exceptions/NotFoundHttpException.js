'use strict';

// Including Lala's modules.
const NotFoundException = require('./NotFoundException');

/**
 * An exception that should be thrown when the requested resource doesn't exist, namely, the 404 HTTP error.
 */
class NotFoundHttpException extends NotFoundException {
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

module.exports = NotFoundHttpException;