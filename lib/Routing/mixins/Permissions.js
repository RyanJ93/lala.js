'use strict';

// Including Lala's modules.
const Mixin = require('../../Support/Mixin');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Provides permission management capabilities.
 *
 * @mixin
 */
class Permissions extends Mixin {
    /**
     * Indexes the given permissions generating a series of patterns that can be helpful in permission comparison.
     *
     * @param {string} permission A string representing the permission to index.
     *
     * @protected
     */
    _indexPermission(permission){
        // Divide the given permission into components.
        const components = permission.split('.');
        const results = [permission];
        const length = components.length - 1;
        // Generate an incremental series of strings based on permission's pieces.
        for ( let i = 0, prev = '' ; i < length ; i++ ){
            prev += i === 0 ? components[i] : ( '.' + components[i] );
            results.push(prev + '.*');
        }
        this._permissionsIndex.set(permission, results);
        this._serializePermissions();
    }

    /**
     * Generates a serialized string that contains all the permissions that have been defined.
     *
     * @protected
     */
    _serializePermissions(){
        // Generate a serialized string containing all the permissions defined so far.
        this._serializedPermissions = Array.from(this._permissions).join(',');
    }
    
    /**
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {Set<string>} _permissions A set containing all the permissions required by this route stored as strings.
         *
         * @protected
         */
        this._permissions = new Set();

        /**
         * @type {Map<string, string[]>} _permissionsIndex A map containing as key the permission identifier and as value all the patters generated from it.
         *
         * @protected
         */
        this._permissionsIndex = new Map();

        /**
         * @type {string} _serializedPermissions A string containing the serialization of all the permissions defined.
         * 
         * @protected
         */
        this._serializedPermissions = '';
    }

    /**
     * Adds one permission to this route, this method is chainable.
     *
     * @param {string} permission A string representing the permission identifier.
     *
     * @returns {Permissions}
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    addPermission(permission){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        this._permissions.add(permission);
        this._indexPermission(permission);
        return this;
    }

    /**
     * Removes a permission from the list of all the permissions required by this route, this method is chainable.
     *
     * @param {string} permission A string representing the permission identifier.
     *
     * @returns {Permissions}
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    removePermission(permission){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        this._permissions.delete(permission);
        this._permissionsIndex.delete(permission);
        this._serializePermissions();
        return this;
    }

    /**
     * Sets all the permissions required by this route, this method is chainable.
     *
     * @param {?Set<string>} permissions A set containing the permission identifiers as strings.
     *
     * @returns {Permissions}
     *
     * @throws {InvalidArgumentException} If an invalid set of permissions is given.
     */
    setPermissions(permissions){
        if ( permissions !== null && !( permissions instanceof Set ) ){
            throw new InvalidArgumentException('Invalid permissions set.', 1);
        }
        // Drop currently defined permissions.
        this.dropPermissions();
        if ( permissions !== null ){
            // Validate and add permissions.
            for ( const permission of permissions ){
                if ( permission !== '' && typeof permission === 'string' ){
                    this._permissions.add(permission);
                    this._indexPermission(permission);
                }
            }
            this._serializePermissions();
        }
        return this;
    }

    /**
     * Sets all the permissions required by this route as an array, this method is chainable.
     *
     * @param {?string[]} permissions An array containing the permission identifiers as strings.
     *
     * @returns {Permissions}
     *
     * @throws {InvalidArgumentException} If an invalid array of permissions is given.
     */
    setPermissionsAsArray(permissions){
        if ( permissions !== null && !Array.isArray(permissions) ){
            throw new InvalidArgumentException('Invalid permissions array.', 1);
        }
        // Drop currently defined permissions.
        this.dropPermissions();
        if ( permissions !== null ){
            const length = permissions.length;
            // Validate and add permissions.
            for ( let i = 0 ; i < length ; i++ ){
                if ( permissions[i] !== '' && typeof permissions[i] === 'string' ){
                    this._permissions.add(permissions[i]);
                    this._indexPermission(permissions[i]);
                }
            }
            this._serializePermissions();
        }
        return this;
    }

    /**
     * Drops all the permissions defined for this route, this method is chainable.
     *
     * @returns {Permissions}
     */
    dropPermissions(){
        this._permissions.clear();
        this._permissionsIndex.clear();
        this._serializedPermissions = '';
        return this;
    }

    /**
     * Returns all the permissions that have been defined for this route.
     *
     * @returns {Set<string>} A set containing the permission identifiers as strings.
     */
    getPermissions(){
        return this._permissions;
    }

    /**
     * Returns all the permissions that have been defined for this route as an array.
     *
     * @returns {string[]} An array containing the permission identifiers as strings.
     */
    getPermissionsAsArray(){
        return Array.from(this._permissions);
    }

    /**
     * Returns all the patters that have been generated based on a given permission.
     *
     * @param {string} permission A string representing the permission identifier.
     *
     * @returns {string[]} An array of strings containing all the patterns generated.
     */
    getPermissionPatterns(permission){
        return this._permissionsIndex.get(permission);
    }

    /**
     * Returns a string containing a serialization of all the permissions that have been defined so far.
     *
     * @returns {string} A string containing the serialization.
     */
    getSerializedPermissions(){
        return this._serializedPermissions
    }
}

module.exports = Permissions;
