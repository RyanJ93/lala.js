'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const Context = require('../Types/Context');
const {
    RuntimeException
} = require('../Exceptions');

/**
 * Allows to create controllers according to the MVC pattern.
 *
 * @abstract
 */
class Controller extends EventEmitter {
    /**
     * The class constructor.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(request, response){
        super();

        /**
         * @type {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
         *
         * @protected
         */
        this._request = request;

        /**
         * @type {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
         *
         * @protected
         */
        this._response = response;

        /**
         * @type {?Context} [_context] An instance of the class "Context" representing the client transaction being processed.
         *
         * @protected
         */
        this._context = null;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Controller' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        if ( request !== null && response !== null && typeof request === 'object' && typeof response === 'object' ){
            this._context = new Context(request, response);
        }
    }
}

module.exports = Controller;
