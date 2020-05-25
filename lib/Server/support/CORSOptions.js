'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @callback allowOriginCallback The callback that allows to set the allowed origin dynamically.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 *
 * @returns {?string} A string containing the allowed origin or null if any origin should be allowed.
 */

/**
 * Allows to configure the Cross-Origin Resource Sharing (CORS) mechanism on a route, router or server.
 */
class CORSOptions {
    /**
     * Returns the origin to declare to the client as the allowed one.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {?string} A string containing the origin to declare, if any origin should be allowed will be returned null.
     *
     * @protected
     */
    _getComputedOrigin(request, response){
        let origin = this._allowOrigin;
        if ( typeof this._allowOriginCallback === 'function' ){
            // A callback has been defined, generate the origin dynamically.
            origin = this._allowOriginCallback(request, response);
        }
        return origin;
    }

    /**
     * Checks if a request is valid according to defined CORS settings.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {string} origin The origin where the request comes from.
     *
     * @returns {boolean} If the request is valid will be returned "true".
     *
     * @protected
     */
    _validateRequest(request, origin){
        let valid = false;
        // Check if the given origin is accepted.
        if ( origin === '*' || request.headers.origin === origin ){
            const requestMethod = request.headers['access-control-request-method'];
            // Check if the method of the request the client is intended to do is accepted.
            if ( this._allowMethods === null || this._allowMethods.indexOf(requestMethod) >= 0 ){
                if ( this._allowHeaders === null ){
                    // Any HTTP header is accepted.
                    valid = true;
                }else{
                    // Check if every declared HTTP header is accepted.
                    const requestHeaders = request.headers['access-control-request-headers'].split(',');
                    const length = requestHeaders.length;
                    let found = true, i = 0;
                    while ( i < length && found ){
                        if ( this._allowHeaders.indexOf(requestHeaders[i].trim().toLowerCase()) === -1 ){
                            found = false;
                        }
                        i++;
                    }
                    valid = found;
                }
            }
        }
        return valid;
    }

    /**
     * The class constructor.
     */
    constructor() {
        /**
         * @type {?string} [_allowOrigin] A string containing the origin URL where requests are allowed from, if null, any URL will be accepted.
         *
         * @protected
         */
        this._allowOrigin = null;

        /**
         * @type {?allowOriginCallback} [_allowOriginCallback] A callback function to invoke in order to get the origin URL dynamically.
         *
         * @protected
         */
        this._allowOriginCallback = null;

        /**
         * @type {?string[]} [_exposeHeaders=[]] An array of strings containing all the HTTP headers that can be exposed as part of the response, if null, any header will be exposed.
         *
         * @protected
         */
        this._exposeHeaders = [];

        /**
         * @type {number} [_maxAge=0] An integer number greater than zero representing how long CORS directives should be cached for on the client side, if zero it will be ignored.
         *
         * @protected
         */
        this._maxAge = 0;

        /**
         * @type {boolean} [_allowCredentials=false] If set to "true" credentials (cookies, authorization headers or TLS client certificates) can be exposed to front-end.
         *
         * @protected
         */
        this._allowCredentials = false;

        /**
         * @type {?string[]} [_allowMethods] An array of strings containing the allowed HTTP methods, if null, any method is allowed.
         *
         * @protected
         */
        this._allowMethods = null;

        /**
         * @type {?string[]} [_allowHeaders] An array of strings containing the allowed HTTP headers, if null, any header is allowed.
         *
         * @protected
         */
        this._allowHeaders = null;

        /**
         * @type {boolean} [_strict=false] If set to "true" incoming requests will be actively validated according to defined settings, if invalid, they will be blocked.
         *
         * @protected
         */
        this._strict = false;
    }

    /**
     * Sets the origin the requests are allowed to come from, this method is chainable.
     *
     * @param {?string} allowOrigin A string containing the origin or null if any origin is accepted.
     *
     * @returns {CORSOptions}
     *
     * @throws {InvalidArgumentException} If an invalid origin is given.
     */
    setAllowOrigin(allowOrigin){
        if ( allowOrigin !== null && ( allowOrigin === '' || typeof allowOrigin !== 'string' ) ){
            throw new InvalidArgumentException('Invalid allowed origin.', 1);
        }
        this._allowOrigin = allowOrigin;
        return this;
    }

    /**
     * Return the origin the requests are allowed to come from that has been defined.
     *
     * @returns {?string} A string containing the origin or null if any origin is accepted.
     */
    getAllowOrigin(){
        return this._allowOrigin;
    }

    /**
     * Sets a callback function that will be invoked in order to determinate the allowed origin for a given request, this method is chainable.
     *
     * @param {?allowOriginCallback} allowOriginCallback A callback function to invoke or null if the allowed origin should be static.
     *
     * @returns {CORSOptions}
     *
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    setAllowOriginCallback(allowOriginCallback){
        if ( allowOriginCallback !== null && typeof allowOriginCallback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        this._allowOriginCallback = allowOriginCallback;
        return this;
    }

    /**
     * Returns the callback function that has been defined in order to determinate the allowed origin dynamically.
     *
     * @returns {?allowOriginCallback} The callback function or null if none has been defined.
     */
    getAllowOriginCallback(){
        return this._allowOriginCallback;
    }

    /**
     * Sets the HTTP headers that can be exposed as part of the response, this method is chainable.
     *
     * @param {?string[]} exposeHeaders An array of strings containing the headers, if set to null, any header will be exposed.
     *
     * @returns {CORSOptions}
     *
     * @throws {InvalidArgumentException} If an invalid array of headers is given.
     */
    setExposeHeaders(exposeHeaders){
        if ( exposeHeaders !== null || !Array.isArray(exposeHeaders) ){
            throw new InvalidArgumentException('Invalid exposed headers list.', 1);
        }
        if ( exposeHeaders === null ){
            this._exposeHeaders = null;
        }else{
            // Normalize the given headers converting the into the lower case form.
            this._exposeHeaders = [];
            const length = exposeHeaders.length;
            for ( let i = 0 ; i < length ; i++ ){
                this._exposeHeaders.push(exposeHeaders[i].toLowerCase());
            }
        }
        return this;
    }

    /**
     * Returns the HTTP headers that can be exposed as part of the response that have been defined.
     *
     * @returns {?string[]} An array of strings containing the headers or null if none has been defined.
     */
    getExposeHeaders(){
        return this._exposeHeaders;
    }

    /**
     * Sets how long CORS directives should be cached for on the client side, this method is chainable.
     *
     * @param {number} maxAge An integer number greater or equal than zero representing the how long cache should last in seconds, if zero no caching will be applied.
     *
     * @returns {CORSOptions}
     *
     * @throws {InvalidArgumentException} If an invalid max age value is given.
     */
    setMaxAge(maxAge){
        if ( maxAge === null || isNaN(maxAge) || maxAge < 0 ){
            throw new InvalidArgumentException('Invalid max age value.', 1);
        }
        this._maxAge = maxAge;
        return this;
    }

    /**
     * Returns how long CORS directives should be cached for on the client side.
     *
     * @returns {number} An integer number greater or equal than zero representing the how long cache should last in seconds or zero if no caching should be applied.
     */
    getMaxAge(){
        return this._maxAge;
    }

    /**
     * Sets if credentials (cookies, authorization headers or TLS client certificates) can be exposed to front-end, this method is chainable.
     *
     * @param {boolean} allowCredentials If set to "true" credentials will be allowed to be exposed to the front-end.
     *
     * @returns {CORSOptions}
     */
    setAllowCredentials(allowCredentials){
        this._allowCredentials = allowCredentials === true;
        return this;
    }

    /**
     * Returns if credentials (cookies, authorization headers or TLS client certificates) can be exposed to front-end.
     *
     * @returns {boolean} If credentials are allowed to be exposed to the front-end will be returned "true".
     */
    getAllowCredentials(){
        return this._allowCredentials === true;
    }

    /**
     * Sets the allowed HTTP methods, this method is chainable.
     *
     * @param {?string[]} allowMethods An array of strings containing the HTTP methods accepted for the incoming requests, if null any method will be accepted.
     *
     * @returns {CORSOptions}
     *
     * @throws {InvalidArgumentException} If an invalid method list is given.
     */
    setAllowMethods(allowMethods){
        if ( allowMethods !== null && !Array.isArray(allowMethods) ){
            throw new InvalidArgumentException('Invalid allowed HTTP methods list.', 1);
        }
        if ( allowMethods === null ){
            this._allowMethods = null;
        }else{
            // Normalize the given methods converting the into the upper case form.
            this._allowMethods = [];
            const length = allowMethods.length;
            for ( let i = 0 ; i < length ; i++ ){
                this._allowMethods.push(allowMethods[i].toUpperCase());
            }
        }
        return this;
    }

    /**
     * Returns the list of allowed HTTP methods.
     *
     * @returns {?string[]} An array of strings containing the HTTP methods defined or null if any method is accepted.
     */
    getAllowMethods(){
        return this._allowMethods;
    }

    /**
     * Sets the HTTP headers that can be included in client requests, this method is chainable.
     *
     * @param {?string[]} allowHeaders An array containing the list of HTTP headers, if null any header will be accepted.
     *
     * @returns {CORSOptions}
     *
     * @throws {InvalidArgumentException} If an invalid header list is given.
     */
    setAllowHeaders(allowHeaders){
        if ( allowHeaders !== null && !Array.isArray(allowHeaders) ){
            throw new InvalidArgumentException('Invalid allowed HTTP headers list.', 1);
        }
        if ( allowHeaders === null ){
            this._allowHeaders = null;
        }else{
            // Normalize the given headers converting the into the lower case form.
            this._allowHeaders = [];
            const length = allowHeaders.length;
            for ( let i = 0 ; i < length ; i++ ){
                this._allowHeaders.push(allowHeaders[i].toLowerCase());
            }
        }
        return this;
    }

    /**
     * Returns the list of HTTP headers that can be included in client requests.
     *
     * @returns {?string[]} An array containing the list of HTTP headers or null if any header is accepted.
     */
    getAllowHeaders(){
        return this._allowHeaders;
    }

    /**
     * Sets if an active check must be performed on incoming requests in order to reject the ones that doesn't meet the defined CORS settings, this method is chainable.
     *
     * @param {boolean} strict If set to "true" an active check will be performed on incoming requests.
     *
     * @returns {CORSOptions}
     */
    setStrict(strict){
        this._strict = strict === true;
        return this;
    }

    /**
     * Returns if an active check should be performed on incoming requests.
     *
     * @returns {boolean} If an active check is going to be performed will be returned "true".
     */
    getStrict(){
        return this._strict === true;
    }

    /**
     * Generates the HTTP headers to include in the client response.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Object.<string, string>} An object containing the generated headers as key/value pairs.
     */
    buildHeaders(request, response){
        const headers = {};
        // Get or generate the allowed origin to declare.
        const origin = this._getComputedOrigin(request, response);
        if ( request.isPreflightRequest !== true || this._validateRequest(request, origin) ){
            // Current request is valid according to defined CORS options, declare the CORS headers.
            headers['Access-Control-Allow-Origin'] = origin === null ? '*' : origin;
            if ( this._allowCredentials === true ){
                headers['Access-Control-Allow-Credentials'] = 'true';
            }
            if ( this._exposeHeaders === null ){
                headers['Access-Control-Expose-Headers'] = '*';
            }else if ( Array.isArray(this._exposeHeaders) && this._exposeHeaders.length > 0 ){
                headers['Access-Control-Expose-Headers'] = this._exposeHeaders.join(', ');
            }
            if ( request.isPreflightRequest === true ){
                // Current request is a valid OPTIONS request, declare the remaining CORS options providing the full CORS policy to the client.
                if ( this._maxAge > 0 ){
                    headers['Access-Control-Max-Age'] = this._maxAge;
                }
                if ( this._allowMethods === null ){
                    headers['Access-Control-Allow-Methods'] = '*';
                }else if ( Array.isArray(this._allowMethods) && this._allowMethods.length > 0 ){
                    headers['Access-Control-Allow-Methods'] = this._allowMethods.join(', ');
                }
                if ( this._allowHeaders === '*' ){
                    headers['Access-Control-Allow-Headers'] = '*';
                }else if ( Array.isArray(this._allowHeaders) && this._allowHeaders.length > 0 ){
                    headers['Access-Control-Allow-Headers'] = this._allowHeaders.join(', ');
                }
            }
        }
        return headers;
    }

    /**
     * Validates an incoming request according to defined CORS settings.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {boolean} If the given request meets the defined CORS settings will be returned "true".
     */
    validate(request, response){
        return this._strict !== true || this._validateRequest(request, this._getComputedOrigin(request, response));
    }
}

module.exports = CORSOptions;
