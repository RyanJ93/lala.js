'use strict';

// Including Lala's modules.
const CredentialsProvider = require('./CredentialsProvider');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @callback getCredentials
 *
 * @param {string} identifier A string representing the unique identifier of the user to lookup.
 *
 * @returns {Promise<*>} The credentials found.
 *
 * @async
 */

/**
 * Represents a credentials provider where credentials are looked up using a custom callback.
 */
class CallbackBasedCredentialsProvider extends CredentialsProvider {
    /**
     * The class constructor.
     *
     * @param {?getCredentials} callback The callback function to invoke in order to lookup the user.
     */
    constructor(callback){
        super();

        /**
         * @type {?getCredentials} _callback The callback function to invoke in order to lookup the user.
         *
         * @protected
         */
        this._callback = typeof callback === 'function' ? callback : null;
    }

    /**
     * Sets the callback function to invoke in order to get credentials, this method is chainable.
     *
     * @param {?getCredentials} callback The callback function.
     *
     * @returns {CallbackBasedCredentialsProvider}
     */
    setCallback(callback){
        if ( callback !== null && typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        this._callback = callback;
        return this;
    }

    /**
     * Returns the callback function that has been defined.
     *
     * @returns {?getCredentials} The callback function or null if no callback function has been defined yet.
     */
    getCallback(){
        return this._callback;
    }

    /**
     * Looks up user credentials based an a given user unique identifier, such as the username.
     *
     * @param {string} identifier A string representing the unique identifier of the user whose credentials will be looked up.
     *
     * @returns {Promise<?Credentials>} An instance of the class "Credentials" representing the credentials found null if no credential is found.
     *
     * @throws {InvalidArgumentException} If an invalid user identifier is given.
     *
     * @async
     * @override
     */
    async lookup(identifier){
        let credentials = null;
        if ( typeof this._callback === 'function' ){
            const result = await this._callback(identifier);
            if ( result !== null ){
                // Convert returned credentials into an object representation.
                credentials = CallbackBasedCredentialsProvider._generateCredentialsObject(identifier, result);
            }
        }
        return credentials;
    }
}

module.exports = CallbackBasedCredentialsProvider;