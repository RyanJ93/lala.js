'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * This class represents a pair of user credentials, usually username and password.
 */
class Credentials {
    /**
     * The class constructor.
     *
     * @param {string?} userID A string representing the user unique identifier, usually its username.
     * @param {string?} password A string representing the user password without any encryption layer applied on.
     */
    constructor(userID, password){
        /**
         * @type {string} _userID A string representing the user unique identifier, usually its username.
         *
         * @protected
         */
        this._userID = typeof userID === 'string' ? userID : '';

        /**
         * @type {string} _password A string representing the user password.
         *
         * @protected
         */
        this._password = typeof password === 'string' ? password : '';

        /**
         * @type {*} _userData Some arbitrary data representing or containing the user properties or an user representation.
         *
         * @protected
         */
        this._userData = null;
    }

    /**
     * Sets the user unique identifier, this method is chainable.
     *
     * @param {string} userID A string containing the user identifier.
     *
     * @returns {Credentials}
     *
     * @throws {InvalidArgumentException} If an invalid user identifier is given.
     */
    setUserID(userID){
        if ( typeof userID !== 'string' ){
            throw new InvalidArgumentException('Invalid user identifier.', 1);
        }
        this._userID = userID;
        return this;
    }

    /**
     * Returns the user unique identifier.
     *
     * @returns {string} A string containing the user identifier or an empty string if no user identifier has been defined.
     */
    getUserID(){
        return this._userID;
    }

    /**
     * Sets the user password, this method is chainable.
     *
     * @param {string} password A string representing the user password without any encryption layer applied on.
     *
     * @returns {Credentials}
     *
     * @throws {InvalidArgumentException} If an invalid password is given.
     */
    setPassword(password){
        if ( typeof password !== 'string' ){
            throw new InvalidArgumentException('Invalid password.', 1);
        }
        this._password = password;
        return this;
    }

    /**
     * Returns the user password.
     *
     * @returns {string} A string representing the user password or an empty string if no password has been defined.
     */
    getPassword(){
        return this._password;
    }

    /**
     * Sets some user properties, this method is chainable.
     *
     * @param {*} userData Some arbitrary data representing or containing the user properties or an user representation.
     *
     * @return {Credentials}
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

module.exports = Credentials;