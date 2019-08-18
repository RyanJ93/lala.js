'use strict';

// Including Lala's modules.
const HTTPException = require('./HTTPException');

/**
 * An exception that should be thrown when current client has made too many requests to this service, namely, the 429 HTTP error.
 */
class TooManyRequestsHTTPException extends HTTPException {
    /**
     * Returns the error description to send back to the client whenever this error occurs.
     *
     * @return {string} A string containing the description message.
     *
     * @override
     */
    static getHTTPMessage(){
        return 'Too Many Requests';
    }

    /**
     * Returns the HTTP status code representing this error according to the HTTP protocol.
     *
     * @return {number} An integer number greater than zero representing the HTTP status code.
     *
     * @override
     */
    static getHTTPStatusCode(){
        return 429;
    }

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

module.exports = TooManyRequestsHTTPException;
