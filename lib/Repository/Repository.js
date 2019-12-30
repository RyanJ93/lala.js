'use strict';

// Including Lala's modules.
const BaseRepository = require('./BaseRepository');
const {
    InvalidArgumentException,
    NotFoundException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * Extends the base repository system allowing to define a default item for a specific namespace.
 */
class Repository extends BaseRepository {
    /**
     * @type {Object.<string, *>} _defaults The object used to store default items having as key the item class namespace.
     *
     * @protected
     */
    static _defaults = {};

    /**
     * Sets the item that can be used as default object within the given namespace.
     *
     * @param {string} name A string containing the name of the object to use as default object, note that it must have been registered first.
     * @param {?string} [namespace] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     * @throws {InvalidArgumentException}
     */
    static setDefault(name, namespace = null){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid name.', 1);
        }
        namespace = Repository._buildNamespace(namespace);
        if ( !Repository.has(name, namespace) ){
            throw new InvalidArgumentException('The given name has not been registered.', 3);
        }
        Repository._defaults[namespace] = name;
    }

    /**
     * Returns the object that as defined as default object for the given namespace.
     *
     * @param {?string} [namespace] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {*} The default object defined.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     * @throws {BadMethodCallException} If no default object has been defined.
     * @throws {NotFoundException} If the default object defined doesn't exist anymore.
     */
    static getDefault(namespace = null){
        namespace = Repository._buildNamespace(namespace);
        if ( !Repository._defaults.hasOwnProperty(namespace) ){
            throw new BadMethodCallException('No default object defined.', 3);
        }
        const obj = Repository.get(Repository._defaults[namespace], namespace);
        if ( obj === null ){
            throw new NotFoundException('The default object is no longer existing.', 4);
        }
        return obj;
    }
}

module.exports = Repository;
