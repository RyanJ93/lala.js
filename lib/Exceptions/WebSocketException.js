'use strict';

// Including Lala's modules.
const Exception = require('./Exception');

/**
 * An exception that should be thrown when a generic error occurs while processing a message sent over the WebSocket protocol.
 */
class WebSocketException extends Exception {
    /**
     * Returns the error message to send back to the client whenever this error occurs.
     *
     * @return {string} A string containing the message.
     */
    static getWebSocketMessage(){
        return 'Internal Server Error';
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

module.exports = WebSocketException;
