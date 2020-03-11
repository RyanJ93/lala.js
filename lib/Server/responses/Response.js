'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const {
    NotCallableException
} = require('../../Exceptions');

/**
 * Represents a generic response to send back to the client.
 *
 * @abstract
 */
class Response extends EventEmitter {
    /**
     * Returns the content type that should be declared to the client according to this response's returned data.
     *
     * @returns {?string} A string representing the content type or null if no suitable content type has been found.
     */
    getComputedContentType(){
        return null;
    }

    /**
     * Returns the charset that should be declared to the client alongside the content type.
     *
     * @returns {?string} A string representing the charset or null if no suitable charset has been found.
     */
    getComputedCharset(){
        return null;
    }

    /**
     * Applies this response to the given request context, this method must be overridden and implemented.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async apply(request, response){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Response;
