'use strict';

const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents a request context including the object representing the request stream and the object representing the response stream.
 */
class Context {
    /**
     * The class constructor.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @throws {InvalidArgumentException} If an invalid object is given as request object.
     * @throws {InvalidArgumentException} If an invalid object is given as response object.
     */
    constructor(request, response){
        if ( request === null || typeof request !== 'object' ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        if ( response === null || typeof response !== 'object' ){
            throw new InvalidArgumentException('Invalid response object.', 2);
        }
        this._request = request;
        this._response = response;
    }

    /**
     * Returns the request stream.
     *
     * @return {module:http.IncomingMessage} An instance of the built-in class "IncomingMessage" containing all the connection properties.
     */
    getRequest(){
        return this._request;
    }

    /**
     * Returns the response stream.
     *
     * @return {module:http.ServerResponse} An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     */
    getResponse(){
        return this._response;
    }
}

module.exports = Context;
