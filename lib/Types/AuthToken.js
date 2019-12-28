'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents an auth token associated to an user, usually used in API authentication.
 */
class AuthToken {
    /**
     * The class constructor.
     *
     * @param {string?} token A string representing the auth token.
     */
    constructor(token){
        /**
         * @type {string} _token
         *
         * @private
         */
        this._token = typeof token === 'string' ? token : '';

        /**
         * @type {*} _userData Some arbitrary data representing or containing the user properties or an user representation.
         *
         * @protected
         */
        this._userData = null;
    }

    /**
     * Sets the auth token, this method is chainable.
     *
     * @param {string} token A string representing the auth token.
     *
     * @returns {AuthToken}
     *
     * @throws {InvalidArgumentException} If an invalid token is given.
     */
    setToken(token){
        if ( typeof token !== 'string' ){
            throw new InvalidArgumentException('Invalid token.', 1);
        }
        this._token = token;
        return this;
    }

    /**
     * Returns the auth token that has been defined.
     *
     * @returns {string} A string representing the auth token defined or an empty string if no token has been defined.
     */
    getToken(){
        return this._token;
    }

    /**
     * Sets some user properties, this method is chainable.
     *
     * @param {*} userData Some arbitrary data representing or containing the user properties or an user representation.
     *
     * @return {AuthToken}
     */
    setUserData(userData){
        this._userData = userData;
        return this;
    }

    /**
     * Returns the user properties or representation defined.
     *
     * @return {*} Some arbitrary data that have been defined for this user.
     */
    getUserData(){
        return this._userData;
    }
}

module.exports = AuthToken;