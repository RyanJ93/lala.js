'use strict';

// Including Lala's modules.
const UserSession = require('./UserSession');
const Permissions = require('../Routing/mixins/Permissions');
const { mixin } = require('../helpers');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {Object} AuthenticationResultOptions An object used to define some additional option for the authentication result being created.
 *
 * @property {*} [userData=null] Some custom data associated to the authenticated user.
 * @property {?UserSession} [session=null] An instance of the class "UserSession" representing the session belonging to this user register within the authenticator.
 * @property {?Set<string>} [permissions]
 */

/**
 * Represents a positive result obtained from an authenticator during an user authentication attempt.
 *
 * @mixes Permissions
 */
class AuthenticationResult extends mixin(Permissions) {
    /**
     * The class constructor.
     *
     * @param {string} userIdentifier A string representing the unique user identifier.
     * @param {?AuthenticationResultOptions} [options=null] An object containing the additional properties this object should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid user identifier is given.
     */
    constructor(userIdentifier, options = null){
        super();

        if ( userIdentifier === '' || typeof userIdentifier !== 'string' ){
            throw new InvalidArgumentException('Invalid user identifier.', 1);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }

        /**
         * @type {string} _userIdentifier A string representing the unique identifier of the authenticated user.
         *
         * @protected
         */
        this._userIdentifier = userIdentifier;

        /**
         * @type {*} [_userData=null] _userData Some custom data associated to the authenticated user.
         *
         * protected
         */
        this._userData = options.hasOwnProperty('userData') ? options.userData : null;

        /**
         * @type {?UserSession} [_session=null] An instance of the class "UserSession" representing the session belonging to this user register within the authenticator.
         *
         * @protected
         */
        this._session = options.hasOwnProperty('session') && options.session instanceof UserSession ? options.session : null;

        if ( options.hasOwnProperty('permissions') && options.permissions instanceof Set ){
            //
            this.setPermissions(options.permissions);
        }
    }

    /**
     * Returns the unique user identifier defined.
     *
     * @returns {string} A string containing the user identifier.
     */
    getUserIdentifier(){
        return this._userIdentifier;
    }

    /**
     * Returns the user custom data defined.
     *
     * @returns {*} Some custom data defined for this user or null if none has been defined.
     */
    getUserData(){
        return this._userData;
    }

    /**
     * Returns the session associated to this user, if defined.
     *
     * @returns {?UserSession} An instance of the class "UserSession" representing the authentication session or null if none has been defined.
     */
    getSession(){
        return this._session;
    }
}

module.exports = AuthenticationResult;
