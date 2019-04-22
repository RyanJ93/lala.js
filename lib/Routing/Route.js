'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 *
 */
class Route extends BaseRoute {
    /**
     * The class constructor.
     *
     * @param {string} method A string representing the HTTP method for this route.
     * @param {string} path A string containing the path to this route
     * @param {function} handler
     */
    constructor(method, path, handler){
        super();

        /**
         * @type {(function|null)} _handler The callback function to invoke whenever this route gets triggered.
         *
         * @private
         */
        this._handler = null;

        // Set given parameters.
        if ( method !== '' && typeof method === 'string' ){
            this.setMethod(method);
        }
        if ( path !== '' && typeof path === 'string' ){
            this.setPath(path);
        }
        if ( typeof handler === 'function' ){
            this.setHandler(handler);
        }
    }

    /**
     * Sets the handler function that will be invoked whenever this route gets triggered, this method is chainable.
     *
     * @param {function} handler The callback function to invoke.
     *
     * @returns {Route}
     *
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    setHandler(handler){
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        this._handler = handler;
        return this;
    }

    /**
     * Returns the handler function to invoke whenever this route gets triggered.
     *
     * @returns {function} The callback function to invoke.
     */
    getHandler(){
        return this._handler;
    }

    /**
     *
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<*>}
     *
     * @async
     */
    async execute(request, response){
        return typeof this._handler !== 'function' ? null : await this._handler(request, response);
    }
}

module.exports = Route;
