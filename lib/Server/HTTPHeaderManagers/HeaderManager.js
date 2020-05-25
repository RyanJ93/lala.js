'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    NotCallableException
} = require('../../Exceptions');

/**
 * Allows to create classes used to manipulate and configure HTTP headers.
 *
 * @abstract
 */
class HeaderManager {
    /**
     * The class constructor.
     */
    constructor() {
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'HeaderManager' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Generates the HTTP headers to include in the client response.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Object.<string, (string|string[])>} An object having as key the header name and as value one or multiple values (represented as an array).
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    buildHeaders(request, response){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = HeaderManager;
