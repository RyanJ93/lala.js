'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * This class allows to store and making available globally classes and objects associating them an unique identifier and an optional group namespace.
 */
class BaseRepository {
    /**
     * @type {Object.<string, *>} _repository The object used to store registered items and having as key the combination of key and namespace assigned to that item.
     *
     * @protected
     */
    static _repository = {};

    /**
     * Validates and then generates the namespace string based on the custom namespace.
     *
     * @param {string} namespace A string representing the namespace to use, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {string} A string containing the processed namespace.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     *
     * @protected
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
     * @param {?string} [namespace] A string representing the namespace to use, if set to null or empty string, the global namespace will be used instead.
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
        namespace = BaseRepository._buildNamespace(namespace);
        if ( !BaseRepository._repository.hasOwnProperty(namespace) ){
            BaseRepository._repository[namespace] = {};
        }else if ( overwrite !== true && BaseRepository._repository[namespace].hasOwnProperty(name) ){
            throw new InvalidArgumentException('The given object has already been registered.', 3);
        }
        BaseRepository._repository[namespace][name] = object;
    }

    /**
     * Removes a given object from the global object repository.
     *
     * @param {string} name A string containing the name of the object to remove.
     * @param {?string} [namespace] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static remove(name, namespace = null){
        namespace = BaseRepository._buildNamespace(namespace);
        if ( BaseRepository._repository.hasOwnProperty(namespace) ){
            delete BaseRepository._repository[namespace][name];
        }
    }

    /**
     * Checks if an object matching the given name has been registered or not.
     *
     * @param {string} name A string containing the name of the object to remove.
     * @param {?string} [namespace] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
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
        namespace = BaseRepository._buildNamespace(namespace);
        return BaseRepository._repository.hasOwnProperty(namespace) && BaseRepository._repository[namespace].hasOwnProperty(name);
    }

    /**
     * Returns the registered object matching the given key.
     *
     * @param {string} name A string containing the name of the object to remove.
     * @param {?string} [namespace] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {*} The object matching the key, if no object matching the given key is found will be returned null.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static get(name, namespace = null){
        namespace = BaseRepository._buildNamespace(namespace);
        return BaseRepository.has(name, namespace) ? BaseRepository._repository[namespace][name] : null;
    }

    /**
     * Returns all the objects that have been stored under a given namespace.
     *
     * @param {?string} [namespace] A string containing object namespace, if set to null or empty string, the global namespace will be used instead.
     *
     * @returns {Object.<string, *>} An object having as key the object name and as value the object itself.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static getAll(namespace = null){
        namespace = BaseRepository._buildNamespace(namespace);
        return BaseRepository._repository.hasOwnProperty(namespace) ? BaseRepository._repository[namespace] : {};
    }
}

module.exports = BaseRepository;
