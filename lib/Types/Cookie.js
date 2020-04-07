'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {Object} cookieOptions Defines which additional property a cookie should have.
 *
 * @property {?Date} expire An instance of the class "Date" representing the expire date of this cookie, if set to null, it will last forever.
 * @property {?boolean} HTTPOnly If set to "true" it means that this cookie cannot be accessed from JS on client-side.
 * @property {?boolean} secure If set to "true" this cookie will be stored only when using a secure protocol such as the HTTPS protocol.
 * @property {?string} domain A string containing the domain this cookie should be available for.
 * @property {?string} path A string containing the path that current request URL must start with in order to access to this cookie.
 * @property {?sameSitePolicy} sameSite An integer number representing the cookie behaviour when dealing with cross-site requests.
 * @property {?number} maxAge An integer number greater or equal than zero representing the number of seconds until the cookie expires, if set to 0 it means that this cookie wil expire immediately.
 */

/**
 * Represents a HTTP cookie.
 */
class Cookie {
    /**
     * Generates cookie object from given information and options.
     *
     * @param {string} name A string containing the unique cookie name.
     * @param {string} value A string containing the cookie value.
     * @param {?cookieOptions} options An object containing the additional properties this cookie should take care of.
     *
     * @return {Cookie} An instance of this class representing the generated cookie.
     */
    static buildFromOptions(name, value, options){
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        const cookie = new Cookie(name, value);
        if ( options.expire instanceof Date ){
            cookie.setExpire(options.expire);
        }
        cookie.setHTTPOnly(options.HTTPOnly === true);
        cookie.setSecure(options.secure === true);
        if ( options.domain !== '' && typeof options.domain === 'string' ){
            cookie.setDomain(options.domain);
        }
        if ( options.sameSite !== null && options.sameSite >= 1 && options.sameSite <= 2 ){
            cookie.setSameSitePolicy(options.sameSite);
        }
        if ( options.maxAge !== null && !isNaN(options.maxAge) && options.maxAge >= 0 ){
            cookie.setMaxAge(options.maxAge);
        }
        const path = options.path !== '' && typeof options.path === 'string' ? options.path : '/';
        cookie.setPath(path);
        return cookie;
    }

    /**
     * The class constructor.
     *
     * @param {string} name A string representing the cookie name, this value is immutable within the class instance.
     * @param {string} [value=''] A string containing the cookie value.
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    constructor(name, value = ''){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }

        /**
         * @type {string} A string representing the cookie name.
         *
         * @protected
         */
        this._name = name;

        /**
         * @type {string} _value A string containing the cookie value.
         *
         * @protected
         */
        this._value = typeof value === 'string' ? value : '';

        /**
         * @type {?Date} _expire A instance of teh class "Date" representing the date when this cookie will expire, if set to null, this cookie is meant to live forever.
         *
         * @protected
         */
        this._expire = null;

        /**
         * @type {boolean} [_HTTPOnly=false] If set to "true" this cookie is marked to not be available for JavaScript on front-end side.
         *
         * @protected
         */
        this._HTTPOnly = false;

        /**
         * @type {boolean} [_secure=false] If set to "true" this cookie will be stored only if the HTTPS protocol is being used, otherwise it will be ignored.
         *
         * @protected
         */
        this._secure = false;

        /**
         * @type {?string} _domain A string containing the domain name this cookie will be available for (sub-domains included), if not defined this cookie will be available for current domain only.
         *
         * @protected
         */
        this._domain = null;

        /**
         * @type {?string} _path A string containing the path that the request URL must start with in order to access to this cookie.
         *
         * @protected
         */
        this._path = null;

        /**
         * @type {sameSitePolicy} _sameSite Defines the policy to use when dealing with cross-site requests, if set to "1" this cookie won't be sent in cross-site requests.
         *
         * @protected
         */
        this._sameSite = null;

        /**
         * @type {?number} _maxAge An integer number greater or equal than zero representing the number of seconds until the cookie expires, if set to 0 it means that this cookie wil expire immediately.
         *
         * @protected
         */
        this._maxAge = null;
    }

    /**
     * Sets the number of seconds until the cookie expires, this method is chainable.
     *
     * @param {?number} maxAge An integer number greater or equal than zero, if set to zero this cookie will expire immediately.
     *
     * @return {Cookie}
     *
     * @throws {InvalidArgumentException} If an invalid lifespan value is given.
     */
    setMaxAge(maxAge){
        if ( isNaN(maxAge) || maxAge < 0 ){
            throw new InvalidArgumentException('Invalid lifespan value.', 1);
        }
        this._maxAge = maxAge === null ? 0 : maxAge;
        return this;
    }

    /**
     * Returns the number of seconds until the cookie expires.
     *
     * @return {?number} An integer number greater or equal than zero or null if no expire has been defined.
     */
    getMaxAge(){
        return this._maxAge;
    }

    /**
     * Defines the behaviour of this cookies when dealing with cross-site requests, this method is chainable.
     *
     * @param {sameSitePolicy} policy An integer number representing the policy to adopt, values form the "sameSitePolicy" enum should be used.
     *
     * @return {Cookie}
     *
     * @throws {InvalidArgumentException} If an invalid policy code is given.
     */
    setSameSitePolicy(policy){
        if ( !Object.values(Cookie.sameSitePolicy).indexOf(policy) ){
            throw new InvalidArgumentException('Invalid policy.');
        }
        this._sameSite = policy;
        return this;
    }

    /**
     * Returns the code representing the defined behaviour of this cookies when dealing with cross-site requests.
     *
     * @return {sameSitePolicy} An integer number representing the policy adopted.
     */
    getSameSitePolicy(){
        return this._sameSite;
    }

    /**
     * Returns the name of the defined policy to adopt whenever dealing with cross-site requests.
     *
     * @return {string} A string containing the policy name, if no policy has been defined, an empty string will be returned instead.
     */
    getSameSitePolicyName(){
        let name = '';
        switch ( this._sameSite ){
            case Cookie.sameSitePolicy.STRICT: {
                name = 'Strict';
            }
            case Cookie.sameSitePolicy.LAX: {
                name = 'Lax';
            }
        }
        return name;
    }

    /**
     * Sets the domain this cookie will be accessible for, this method is chainable.
     *
     * @param {?string} domain A string containing the domain this cookie will be available for (sub-domains included), if set to null this cookie will be available for current domain only.
     *
     * @return {Cookie}
     *
     * @throws {InvalidArgumentException} If an invalid domain is given.
     */
    setDomain(domain){
        if ( domain !== null && ( domain === '' || typeof domain !== 'string' ) ){
            throw new InvalidArgumentException('Invalid domain.', 1);
        }
        this._domain = domain !== null && domain.charAt(0) !== '.' ? ( '.' + domain ) : domain;
        return this;
    }

    /**
     * Returns the domain this cookie will be accessible for.
     *
     * @return {?string} A string containing the domain this cookie will be available for or null if this cookie should be accessible for this domain only.
     */
    getDomains(){
        return this._domain;
    }

    /**
     * Sets the path that the request URL must start with in order to access to this cookie, this method is chainable.
     *
     * @param {?string} path A string containing the path to check or null if this cookie should be available globally across the website.
     *
     * @return {Cookie}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPath(path){
        if ( path !== null && ( path === '' || typeof path !== 'string' ) ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._path = path;
        return this;
    }

    /**
     * Returns the path that the request URL must start with in order to access to this cookie.
     *
     * @return {?string} A string containing the path defined or null if this cookie should be available globally.
     */
    getPath(){
        return this._path;
    }

    /**
     * Returns this cookie name.
     *
     * @return {string} A string representing the cookie name.
     */
    getName(){
        return this._name;
    }

    /**
     * Sets this cookie value, this method is chainable.
     *
     * @param {string} value A string representing the cookie content.
     *
     * @return {Cookie}
     *
     * @throws {InvalidArgumentException} If an invalid value is given.
     */
    setValue(value){
        if ( value === '' || typeof value !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie content.', 1);
        }
        this._value = value;
        return this;
    }

    /**
     * Returns this cookie value.
     *
     * @return {string} A string containing this cookie content.
     */
    getValue(){
        return this._value;
    }

    /**
     * Returns this cookie value as an URL safe string.
     *
     * @return {string} A string containing this cookie content.
     */
    getEncodedValue(){
        return encodeURIComponent(this._value);
    }

    /**
     * Sets the expiration date for this cookie, this method is chainable.
     *
     * @param {?Date} date An instance of the class "Date" representing the expiration date or null if this cookie should expire once the browser is closed.
     *
     * @return {Cookie}
     *
     * @throws {InvalidArgumentException} If an invalid expiration date is given.
     */
    setExpire(date){
        if ( !( date instanceof Date ) && date !== null ){
            throw new InvalidArgumentException('Invalid expire date.', 1);
        }
        this._expire = date;
        return this;
    }

    /**
     * Returns this cookie expiration date.
     *
     * @return {?Date} An instance of the class "Date" representing the expiration date or null if this cookie should expire once the browser is closed.
     */
    getExpire(){
        return this._expire;
    }

    /**
     * Sets if this cookie should not be available for JavaScript on front-end side, this method is chainable.
     *
     * @param {boolean} HTTPOnly If set to "true" it means that this cookie won't be available for JavaScript on the front-end side.
     *
     * @return {Cookie}
     */
    setHTTPOnly(HTTPOnly){
        this._HTTPOnly = HTTPOnly === true;
        return this;
    }

    /**
     * Returns if access to this cookie is denied for JavaScript on front-end side.
     *
     * @return {boolean} If access has been denied will be returned "true".
     */
    getHTTPOnly(){
        return this._HTTPOnly === true;
    }

    /**
     * Sets if this cookie should be stored only if the HTTPS protocol is being used, this method is chainable.
     *
     * @param {boolean} secure If set to "true" this cookie will be stored if the HTTPS protocol is being used.
     *
     * @return {Cookie}
     */
    setSecure(secure){
        this._secure = secure === true;
        return this;
    }

    /**
     * Returns if this cookie should be stored only on client using a secure protocol, such as the HTTPS protocol.
     *
     * @return {boolean} If this cookie should be saved only whenever the HTTPS protocol is being used will be returned "true".
     */
    getSecure(){
        return this._secure;
    }
}

/**
 * An enum representing the behaviour to adopt whenever dealing with cross-site requests.
 *
 * @enum {?number} sameSitePolicy
 * @readonly
 */
Object.defineProperty(Cookie, 'sameSitePolicy', {
    value: Object.freeze({
        NONE: null,
        STRICT: 1,
        LAX: 2
    }),
    writable: false,
    configurable: false,
    enumerable: false
});

module.exports = Cookie;
