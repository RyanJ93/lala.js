'use strict';

// Including native modules.
const http = require('http');

// Including Lala's modules.
const Processor = require('../Processor');
const Cookie = require('../../../Types/Cookie');
const {
    InvalidArgumentException,
    BadMethodCallException
} = require('../../../Exceptions');

/**
 * @typedef HTTPCookieProcessorConfiguration An object containing all the properties of this class that will be setup on class has been instanced.
 */

/**
 * Allows to process and handle HTTP cookies.
 */
class HTTPCookieProcessor extends Processor {
    /**
     * Generates the header string according to each cookie staged to be sent to the client.
     *
     * @return {string[]} A sequential array of strings containing the format used to define and store defined cookies according to the HTTP protocol.
     *
     * @protected
     */
    _generateHeader(){
        const cookies = [];
        for ( const [name, cookie] of this._stagedCookies.entries() ){
            let header = name + '=' + cookie.getEncodedValue() + '; Version=1';
            const expire = cookie.getExpire();
            if ( expire !== null ){
                header += '; Expires=' + expire.toUTCString();
            }
            const domains = cookie.getDomains();
            if ( domains !== null ){
                header += '; Domain=' + domains[0];
            }
            const path = cookie.getPath();
            if ( path !== null ){
                header += '; Path=' + path;
            }
            if ( cookie.getSecure() ){
                header += '; Secure';
            }
            if ( cookie.getHTTPOnly() ){
                header += '; HttpOnly';
            }
            const maxAge = cookie.getMaxAge();
            if ( maxAge !== null ){
                header += '; Max-Age=' + maxAge.toString();
            }
            const sameSitePolicy = cookie.getSameSitePolicyName();
            if ( sameSitePolicy !== '' ){
                header += '; SameSite=' + sameSitePolicy;
            }
            cookies.push(header);
        }
        return cookies;
    }

    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPCookieProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {};
    }

    /**
     * The class constructor.
     *
     * @param {HTTPCookieProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, string>} _clientCookies A map containing the cookie sent by the client stored as key/value pairs.
         *
         * @protected
         */
        this._clientCookies = new Map();

        /**
         * @type {Map<string, Cookie>} _stagedCookies A ma having as key the cookie name and as value an instance of the class "Cookie" representing the cookie to store on the client side.
         *
         * @protected
         */
        this._stagedCookies = new Map();

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPCookieProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        return this;
    }

    /**
     * Processes and load the cookies sent as part of the client request, this method is chainable.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @throws {InvalidArgumentException} If an invalid request object is given.
     */
    parse(request){
        if ( !( request instanceof http.IncomingMessage ) ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        this._clientCookies = new Map();
        if ( request.headers.hasOwnProperty('cookie') && typeof request.headers.cookie === 'string' && request.headers.cookie !== '' ){
            // Split all the cookies contained in the header found.
            const cookies = request.headers.cookie.split('; ');
            const length = cookies.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( cookies[i] !== '' && cookies[i].indexOf('=') !== -1 ){
                    const cookie = cookies[i].split('=');
                    if ( cookie.length === 2 && cookie[0] !== '' ){
                        this._clientCookies.set(cookie[0], cookie[1]);
                    }
                }
            }
        }
        return this;
    }

    /**
     * Returns all the cookies that have been sent by the client.
     *
     * @return {Map<string, string>} A map containing all the cookies found, having as key the unique cookie name and as value its value both as strings.
     */
    getClientCookies(){
        return this._clientCookies;
    }

    /**
     * Returns all the cookies that have been added or marked to be removed.
     *
     * @return {Map<string, Cookie>} A map having as key the unique cookie name and as value an instance of the class "Cookie" representing the cookie and its properties.
     */
    getStagedCookies(){
        return this._stagedCookies;
    }

    /**
     * Adds a cookie to the queue of all the cookie that will sent to the client to be stored, this method is chainable.
     *
     * @param {string} name A string containing the cookie unique name.
     * @param {string} value A string containing some data to store in the cookie.
     * @param {cookieOptions} options An object containing some additional attributes this cookie should take care of.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     * @throws {InvalidArgumentException} If a non-string value is given as cookie value.
     */
    setCookie(name, value, options){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        if ( typeof value !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie value.', 2);
        }
        // Generate the object representing this cookie.
        const cookie = Cookie.buildFromOptions(name, value, options);
        // Add the generated cookie object to the queue.
        this.setCookieObject(cookie);
        return this;
    }

    /**
     * Adds a given cookie to the list of all the cookies staged to be sent to the client, this method is chainable.
     *
     * @param {Cookie} cookie An instance of the class "Cookie" representing the cookie to stage.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie object is given.
     */
    setCookieObject(cookie){
        if ( !( cookie instanceof Cookie ) ){
            throw new InvalidArgumentException('Invalid cookie object.', 1);
        }
        const name = cookie.getName();
        this._stagedCookies.set(name, cookie);
        return this;
    }

    /**
     * Removes a given cookie, this method is chainable.
     *
     * @param {string} name A string containing the cookie unique name.
     * @param {cookieOptions} options An object containing some additional attributes this cookie should take care of, note that expiration day is ignored here.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    removeCookie(name, options){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        const cookie = Cookie.buildFromOptions(name, '', options);
        //
        cookie.setMaxAge(0);
        this._stagedCookies.set(name, cookie);
        return this;
    }

    /**
     * Removes a given cookie from the list of all the cookies to set on the client side, this method is chainable.
     *
     * @param {string} name A string containing the cookie unique name.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    unstageCookie(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        this._stagedCookies.delete(name);
        return this;
    }

    /**
     * Adds to the given server response object the header that contains all the staged cookies to save on the client side, this method is chainable.
     *
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {HTTPCookieProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid response object is given.
     * @throws {BadMethodCallException} If this method is invoked after HTTP headers have been sent to client.
     */
    writeHeader(response){
        if ( !( response instanceof http.ServerResponse ) ){
            throw new InvalidArgumentException('Invalid response object.', 1);
        }
        if ( response.headersSent ){
            throw new BadMethodCallException('Cannot set cookie header as HTTP headers have already been sent to client.', 2);
        }
        const header = this._generateHeader();
        if ( header.length !== 0 ){
            response.setHeader('Set-Cookie', header);
        }
        return this;
    }

    /**
     * Parses and adds cookies found to the given request object by setting the "cookies" property, this method is chainable.
     *
     * {http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @return {HTTPCookieProcessor}
     */
    appendCookies(request){
        this.parse(request);
        request.cookies = this.getClientCookies();
        return this;
    }

    /**
     * Adds some useful function to the given response object allowing to deal with cookies easily, this method is chainable.
     *
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {HTTPCookieProcessor}
     */
    appendHelpers(response){
        response.setCookie = (name, value, options = null) => {
            this.setCookie(name, value, options);
        };
        response.removeCookie = (name, options = null) => {
            this.removeCookie(name, options);
        };
        return this;
    }
}

module.exports = HTTPCookieProcessor;
