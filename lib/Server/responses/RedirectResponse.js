'use strict';

// Including Lala's modules.
const Response = require('./Response');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Represents a HTTP redirect directive to send as a response to the client.
 */
class RedirectResponse extends Response {
    /**
     * The class constructor.
     *
     * @param {string} url A string containing the URL the client should be redirected to.
     * @param {boolean} [permanent=false] If set to "true" this redirection will be marked as permanent by sending 301 status code, otherwise 303 will be used instead.
     * @param {boolean} [preserve=false] If set to "true" request body and method will be preserve by sending 307/308 status code instead of 301/303.
     *
     * @throws {InvalidArgumentException} If an invalid URL is given.
     */
    constructor(url, permanent = false, preserve = false){
        super();

        if ( url === '' || typeof url !==  'string' ){
            throw new InvalidArgumentException('Invalid URL.', 1);
        }

        /**
         * @type {string} _url A string containing the URL the client should be redirected to.
         *
         * @protected
         */
        this._url = url;

        /**
         * @type {boolean} [_permanent=false] If set to "true" number 301 status code will be used in response header, otherwise number 301 will be used instead.
         *
         * @protected
         */
        this._permanent = permanent === true;

        /**
         * @type {boolean} [_protected=false] If set to "true" 307/308 status codes will be preferred over 301/303 in order to preserve request body and method.
         *
         * @protected
         */
        this._preserve = preserve === true;
    }

    /**
     * Returns the URL client should be redirected to.
     *
     * @returns {string} A string containing the URL.
     */
    getURL(){
        return this._url;
    }

    /**
     * Returns if this redirect is meant to be permanent, then the 308 status code will be used in response header.
     *
     * @returns {boolean} IF this redirect is meant to be permanent will be returned "true".
     */
    getPermanent(){
        return this._permanent === true;
    }

    /**
     * Returns if request body and method should be preserved after redirect or not.
     *
     * @return {boolean} If request body and method should be preserved will be returned "true".
     */
    getPreserve(){
        return this._preserve === true;
    }

    /**
     * Prepares internal properties and checks if current response can be served according to current client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If current response can be served will be returned "true".
     *
     * @async
     * @override
     */
    async prepare(request, response){
        return true;
    }

    /**
     * Redirects the client to the URL that has been defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     */
    async apply(request, response){
        if ( this._url !== '' && typeof this._url === 'string' && !response.headersSent && !response.finished ){
            if ( this._permanent === true ){
                if ( this._preserve === true ){
                    response.statusCode = 308;
                    response.statusMessage = 'Permanent Redirect';
                }else{
                    response.statusCode = 301;
                    response.statusMessage = 'Moved Permanently';
                }
            }else{
                if ( this._preserve === true ){
                    response.statusCode = 307;
                    response.statusMessage = 'Temporary Redirect';
                }else{
                    response.statusCode = 303;
                    response.statusMessage = 'See Other';
                }
            }
            response.rawOutput = null;
            response.setHeader('Location', this._url);
        }
        return null;
    }
}

module.exports = RedirectResponse;
