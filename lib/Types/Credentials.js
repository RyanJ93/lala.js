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

        /**
         * @type {Set<string>} _permissions A set containing all the permissions given to the user those credentials are associated to.
         *
         * @protected
         */
        this._permissions = new Set();
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

    /**
     * Adds one permission to the list of all the permissions given to the user whom those credentials are associated to, this method is chainable.
     *
     * @param {string} permission A string representing the identifier of the permission to add.
     *
     * @returns {Credentials}
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    addPermissions(permission){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        this._permissions.add(permission);
        return this;
    }

    /**
     * Removes one permission from the list of all the permissions given to the user whom those credentials are associated to, this method is chainable.
     *
     * @param {string} permission A string representing the identifier of the permission to remove.
     *
     * @returns {Credentials}
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    removePermission(permission){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        this._permissions.delete(permission);
        return this;
    }

    /**
     * Sets the permissions associated to the user whom those credentials are associated to, this method is chainable.
     *
     * @param {?Set<string>} permissions A set containing the permissions to assign, if set to null no permission will be assigned.
     *
     * @returns {Credentials}
     *
     * @throws {InvalidArgumentException} If an invalid set is given.
     */
    setPermissions(permissions){
        if ( permissions !== null && !( permissions instanceof Set ) ){
            throw new InvalidArgumentException('Invalid permissions set.', 1);
        }
        // Drop current permissions.
        this._permissions.clear();
        if ( permissions !== null ){
            this._permissions = permissions;
        }
        return this;
    }

    /**
     * Sets the permissions associated to the user using an array as source, this method is chainable.
     *
     * @param {?string[]} permissions An array of strings containing the permissions to assign, if set to null no permission will be assigned.
     *
     * @returns {Credentials}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setPermissionsAsArray(permissions){
        if ( permissions !== null && !Array.isArray(permissions) ){
            throw new InvalidArgumentException('Invalid permissions array.', 1);
        }
        // Drop current permissions.
        this._permissions.clear();
        if ( permissions !== null ){
            const length = permissions.length;
            // Validate and add each permission.
            for ( let i = 0 ; i < length ; i++ ){
                if ( permissions[i] !== '' && typeof permissions[i] === 'string' ){
                    this._permissions.add(permissions[i]);
                }
            }
        }
        return this;
    }

    /**
     * Drops all the permissions that have been assigned to the user whom those credentials are associated to, this method is chainable.
     *
     * @returns {Credentials}
     */
    dropPermissions(){
        this._permissions.clear();
        return this;
    }

    /**
     * Returns all the permissions that have been assigned to the user whom those credentials are associated to.
     *
     * @returns {Set<string>} A set containing all the permission identifiers as strings.
     */
    getPermissions(){
        return this._permissions;
    }

    /**
     * Returns all the permissions that have been assigned to the user as an array.
     *
     * @returns {string[]} An array of strings containing all the permission identifiers.
     */
    getPermissionsAsArray(){
        return Array.from(this._permissions);
    }
}

module.exports = Credentials;
