'use strict';

// Including Lala's modules.
const BaseRepository = require('../Repository/BaseRepository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @callback typeCastingImplementation The callback function that implements casting from string to a custom to a custom type.
 *
 * @param {string} value A string representing the value to cast.
 * @param {?string} [subType] A string containing the name of an additional type the main one is composed by.
 *
 * @returns {*} The converted value.
 */

/**
 * Store all the available types used by the "Typify" class.
 */
class TypeRepository extends BaseRepository {
    /**
     * Registers a new type.
     *
     * @param {string} name A string containing the type name.
     * @param {typeCastingImplementation} callback The callback function that implements casting from string to this type.
     * @param {boolean} [overwrite=false] If set to "true" it means that if a type has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If another type with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    static register(name, callback, overwrite = false){
        if ( typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        super.register(name, callback, 'com.lala.type', overwrite);
    }

    /**
     * Removes a given type from the repository.
     *
     * @param {string} name A string containing the name of the type to remove.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.type');
    }

    /**
     * Checks if a type matching the given name has been registered or not.
     *
     * @param {string} name A string containing the name of the type to check.
     *
     * @returns {boolean} If the check has been registered and found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.type');
    }

    /**
     * Returns the callback function that implements the registered type matching the given name.
     *
     * @param {string} name A string containing the name of the type to return.
     *
     * @returns {?typeCastingImplementation} The type's casting function or "null" if no type has been found.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.type');
    }

    /**
     * Returns all the type that have been stored under a given namespace.
     *
     * @returns {Object.<string, typeCastingImplementation>} An object having as key the type name and as value the callback function that implements the type.
     */
    static getAll(namespace = null){
        return super.getAll('com.lala.type');
    }
}

module.exports = TypeRepository;
