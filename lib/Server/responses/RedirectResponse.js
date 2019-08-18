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
     * @param {boolean} [permanent=false] If set to "true" this redirection will be marked as permanent by sending 301 status code, otherwise 302 will be used instead.
     *
     * @throws {InvalidArgumentException}
     */
    constructor(url, permanent = false){
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
         * @type {boolean} [_permanent=false] If set to "true" number 301 status code will be used in response header, otherwise number 302 will be used instead.
         *
         * @protected
         */
        this._permanent = permanent === true;
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
            const code = this._permanent === true ? 308 : 307;
            // Set redirection HTTP header and then close current connection.
            response.writeHead(code, {
                Location: this._url
            });
            response.end();
        }
    }
}

module.exports = RedirectResponse;
