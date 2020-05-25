'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const ResponseProperties = require('../support/ResponseProperties');
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
     * The class constructor.
     */
    constructor() {
        super();

        /**
         * @type {ResponseProperties} _responseProperties Contains some properties to declare to the client as a set of HTTP headers.
         *
         * @protected
         */
        this._responseProperties = new ResponseProperties();
    }

    /**
     * Returns the properties to declare to the client as a set of HTTP headers.
     *
     * @return {ResponseProperties} An instance of the class "ResponseProperties" containing these properties.
     */
    getResponseProperties(){
        return this._responseProperties;
    }

    /**
     * Prepares internal properties and checks if current response can be served according to current client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If current response can be served will be returned "true".
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async prepare(request, response){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
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
