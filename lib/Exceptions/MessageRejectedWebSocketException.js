'use strict';

// Including Lala's modules.
const WebSocketException = require('./WebSocketException');

/**
 * An exception that should be thrown whenever a WebSocket message is rejected by some authentication layer or middleware function.
 */
class MessageRejectedWebSocketException extends WebSocketException {
    /**
     * Returns the error message to send back to the client whenever this error occurs.
     *
     * @return {string} A string containing the message.
     */
    static getWebSocketMessage(){
        return 'Message rejected';
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

module.exports = MessageRejectedWebSocketException;
