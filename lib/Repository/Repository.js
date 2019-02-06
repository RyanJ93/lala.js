'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException,
    NotFoundException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * @type {{string: *}}
 *
 * @private
 */
let _repository = {};

/**
 * @type {{}}
 *
 * @private
 */
let _defaults = {};

/**
 * This class allows to store and making available globally classes and objects associating them an unique identifier and an optional group namespace.
 */
class Repository {
    /**
     * Validates and then generates the namespace string based on the custom namespace.
     *
     * @param {string} namespace A string representing the namespace to use, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {string} A string containing the processed namespace.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     *
     * @private
     */
    static _buildNamespace(namespace){
        if ( namespace === '' || namespace === null ){
            return '*';
        }
        if ( typeof namespace !== 'string' ){
            throw new InvalidArgumentException('Invalid namespace.', 2);
        }
        return namespace;
    }

    /**
     * Registers a new object within the global object repository.
     *
     * @param {string} name A string representing an unique name for the object.
     * @param {*} object The object to register.
     * @param {(string|null)} [namespace=null] A string representing the namespace to use, if set to null or empty string, the global namespace will be used instead.
     * @param {boolean} [overwrite=false] If set to "true" it means that if an object has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     * @throws {InvalidArgumentException} If another object with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    static register(name, object, namespace = null, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid name.', 1);
        }
        namespace = Repository._buildNamespace(namespace);
        if ( !_repository.hasOwnProperty(namespace) ){
            _repository[namespace] = {};
        }else if ( overwrite !== true && _repository[namespace].hasOwnProperty(name) ){
            throw new InvalidArgumentException('The given object has already been registered.', 3);
        }
        _repository[namespace][name] = object;
    }

    /**
     * Removes a given object from the global object repository.
     *
     * @param {string} name A string containing the name of the object to remove.
     * @param {(string|null)} [namespace=null] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static remove(name, namespace = null){
        namespace = Repository._buildNamespace(namespace);
        if ( _repository.hasOwnProperty(namespace) ){
            delete _repository[namespace][name];
        }
    }

    /**
     * Checks if an object matching the given name has been registered or not.
     *
     * @param {string} name A string containing the name of the object to remove.
     * @param {(string|null)} [namespace=null] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {boolean} If the object has been registered and found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static has(name, namespace = null){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid name.', 1);
        }
        namespace = Repository._buildNamespace(namespace);
        return _repository.hasOwnProperty(namespace) && _repository[namespace].hasOwnProperty(name);
    }

    /**
     * Returns the registered object matching the given key.
     *
     * @param {string} name A string containing the name of the object to remove.
     * @param {(string|null)} [namespace=null] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {*} The object matching the key, if no object matching the given key is found will be returned null.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static get(name, namespace = null){
        namespace = Repository._buildNamespace(namespace);
        if ( !Repository.has(name, namespace) ){
            return null;
        }
        return _repository[namespace][name];
    }

    /**
     * Returns all the objects that have been stored under a given namespace.
     *
     * @param {(string|null)} [namespace=null] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {{string: *}} An object having as key the object name and as value the object itself.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static getAll(namespace = null){
        namespace = Repository._buildNamespace(namespace);
        if ( !_repository.hasOwnProperty(namespace) ){
            return {};
        }
        return _repository[namespace];
    }

    /**
     * Sets the item that can be used as default object within the given namespace.
     *
     * @param {string} name A string containing the name of the object to use as default object, note that it must have been registered first.
     * @param {(string|null)} [namespace=null] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
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
        _defaults[namespace] = name;
    }

    /**
     * Returns the object that as defined as default object for the given namespace.
     *
     * @param {(string|null)} [namespace=null] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {*} The default object defined.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     * @throws {BadMethodCallException} If no default object has been defined.
     * @throws {NotFoundException} If the default object defined doesn't exist anymore.
     */
    static getDefault(namespace = null){
        namespace = Repository._buildNamespace(namespace);
        if ( !_defaults.hasOwnProperty(namespace) ){
            throw new BadMethodCallException('No default object defined.', 3);
        }
        const obj = Repository.get(_defaults[namespace], namespace);
        if ( obj === null ){
            throw new NotFoundException('The default object is no longer existing.', 4);
        }
        return obj;
    }
}

module.exports = Repository;