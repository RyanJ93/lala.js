'use strict';

// Including native modules.
const crypto = require('crypto');

// Including Lala's modules.
const { generateUUID, generateToken } = require('../../helpers');
const {
    InvalidArgumentException,
    NotFoundException
} = require('../../Exceptions');

/**
 * @typedef {Object} CSRFToken Represents a CSRF token containing both the token and its unique ID.
 *
 * @property {string} id A string containing the token's unique ID, an UUID version 4 representation.
 * @property {string} token A string containing the CSRF token.
 * @property {?number} ttl An integer number greater than zero representing the amount of seconds this token should live for.
 * @property {?number} timeoutID An integer number representing the ID of the timeout function that will be executed to remove this token once expired.
 * @property {?Date} expireDate An instance of the class "Date" representing the date when this CSRF token will expire or null if this token has no expire date.
 */

/**
 * Stores client assigned CSRF Tokens.
 */
class CSRFTokenStorage {
    /**
     * The class constructor.
     */
    constructor() {
        /**
         * @type {number} [_tokenLength=256] An integer number greater than zero representing the length of the tokens to generate.
         *
         * @protected
         */
        this._tokenLength = 256;

        /**
         * @type {Map<string, CSRFToken>} _storage A map containing all the CSRF tokens generated.
         *
         * @protected
         */
        this._storage = new Map();
    }

    /**
     * Sets the length of the tokens to generate, this method is chainable.
     *
     * @param {number} tokenLength An integer number greater than zero representing the token length.
     *
     * @returns {CSRFTokenStorage}
     *
     * @throws {InvalidArgumentException} If an invalid number is given.
     */
    setTokenLength(tokenLength){
        if ( tokenLength === null || isNaN(tokenLength) || tokenLength <= 0 ){
            throw new InvalidArgumentException('Invalid token length.', 1);
        }
        this._tokenLength = tokenLength;
        return this;
    }

    /**
     * Returns the length of the token to generate.
     *
     * @returns {number} An integer number greater than zero representing the token length.
     */
    getTokenLength(){
        return this._tokenLength;
    }

    /**
     * Generates a new CSRF token and then add it to the internal storage.
     *
     * @param {?number} [ttl] An integer number greater than zero representing the amount of seconds this token should live for.
     *
     * @returns {Promise<CSRFToken>} An object containing the generated token and its properties.
     *
     * @throws {InvalidArgumentException} If an invalid expire date is given.
     *
     * @async
     */
    async create(ttl = null){
        if ( ttl !== null && ( isNaN(ttl) || ttl <= 0 ) ){
            throw new InvalidArgumentException('Invalid expire date.', 1);
        }
        // Generate an unique identifier for this token.
        const id = generateUUID(4, false);
        const tokenObj = {
            id: id,
            token: await generateToken(this._tokenLength),
            ttl: ttl,
            timeoutID: null,
            expireDate: null
        };
        if ( ttl !== null ){
            // Setup the function that will remove this token once it has expired.
            tokenObj.timeoutID = setTimeout(() => {
                this._storage.delete(id);
            }, ttl);
            // Generate a date object representing the date when this token will expire.
            const currentTimestamp = Math.floor(( +new Date() ) / 1000);
            tokenObj.expireDate = new Date( currentTimestamp + ttl );
        }
        this._storage.set(tokenObj.id, tokenObj);
        return tokenObj;
    }

    /**
     * Alters the expire date of the given token, this method is chainable.
     *
     * @param {string} id A string representing the token unique ID, an UUID version 4 representation.
     * @param {?number} ttl An integer number greater than zero representing the amount of seconds this token should live for or null if this token should last forever.
     *
     * @returns {CSRFTokenStorage}
     *
     * @throws {InvalidArgumentException} If an invalid token ID is given.
     * @throws {InvalidArgumentException} If an invalid expire date is given.
     * @throws {NotFoundException} If no CSRF token matching the given ID is found.
     */
    expire(id, ttl){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid token ID.', 1);
        }
        if ( ttl !== null && ( isNaN(ttl) || ttl <= 0 ) ){
            throw new InvalidArgumentException('Invalid expire date.', 2);
        }
        const token = this._storage.get(id);
        if ( typeof token === 'undefined' ){
            throw new NotFoundException('No matching token found.', 3);
        }
        if ( token.timeoutID !== null ){
            // Clear previous defined timeout.
            clearTimeout(token.timeoutID);
        }
        if ( ttl === null ){
            token.ttl = token.timeoutID = token.expireDate = null;
        }else{
            // Setup new timer to remove the token once it has expired.
            token.timeoutID = setTimeout(() => {
                this._storage.delete(id);
            }, ttl);
            const currentTimestamp = Math.floor(( +new Date() ) / 1000);
            token.expireDate = new Date( currentTimestamp + ttl );
        }
        return this;
    }

    /**
     * Returns the CSRF token matching the given unique ID.
     *
     * @param {string} id A string representing the token unique ID, an UUID version 4 representation.
     *
     * @returns {?CSRFToken} The CSRF token found or null if no token matching the given ID is found.
     *
     * @throws {InvalidArgumentException} If an invalid token ID is given.
     */
    get(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid token ID.', 1);
        }
        const token = this._storage.get(id);
        return typeof token === 'undefined' ? null : token;
    }

    /**
     * Checks if a given token exists according to its unique ID.
     *
     * @param {string} id A string representing the token unique ID, an UUID version 4 representation.
     *
     * @returns {boolean} If a token matching the given ID exists will be returned "true".
     *
     * @throws {InvalidArgumentException} If an invalid token ID is given.
     */
    has(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid token ID.', 1);
        }
        return this._storage.has(id);
    }

    /**
     * Checks if a given token matches the one matching the given unique ID:
     *
     * @param {string} id A string representing the token unique ID, an UUID version 4 representation.
     * @param {string} token A string containing the token to compare.
     *
     * @returns {boolean} If the given token matches the original one will be returned "true".
     *
     * @throws {InvalidArgumentException} If an invalid token ID is given.
     * @throws {InvalidArgumentException} If an invalid token is given.
     * @throws {NotFoundException} If no token matching the given ID is found.
     */
    verify(id, token){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid token ID.', 1);
        }
        if ( token === '' || typeof token !== 'string' ){
            throw new InvalidArgumentException('Invalid token.', 2);
        }
        const tokenObj = this.get(id);
        if ( tokenObj === null ){
            throw new NotFoundException('No token matching the given id was found.', 3);
        }
        const source = Buffer.from(token);
        const target = Buffer.from(tokenObj.token);
        // Buffers must have the same length in order to be equal and to use the "timingSafeEqual" method.
        return source.length === target.length && crypto.timingSafeEqual(source, target);
    }

    /**
     * Removes the token matching the given unique ID from the repository, this method is chainable.
     *
     * @param {string} id A string representing the token unique ID, an UUID version 4 representation.
     *
     * @returns {CSRFTokenStorage}
     *
     * @throws {InvalidArgumentException} If an invalid token ID is given.
     */
    drop(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid token ID.', 1);
        }
        this._storage.delete(id);
        return this;
    }
}

module.exports = CSRFTokenStorage;
