'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Contains all the registered cache instances.
 */
class CacheRepository extends Repository {
    /**
     * Registers a cache instance allowing to share it across the project.
     *
     * @param {string} name A string containing the instance name, it must be unique.
     * @param {Cache} cache The instance of the class "Cache" that will be registered.
     * @param {boolean} [overwrite=false]  If set to "true" it means that if the instance has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid instance name is given.
     * @throws {InvalidArgumentException} If another instance with the same name has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid cache instance is given.
     */
    static register(name, cache, overwrite = false){
        if ( cache === null || typeof cache !== 'object' || cache.constructor.name !== 'Cache' ){
            throw new InvalidArgumentException('Invalid cache instance.', 4);
        }
        super.register(name, cache, 'com.lala.cache', overwrite);
    }

    /**
     * Removes a cache instance that has been registered.
     *
     * @param {string} name A string containing the instance name.
     *
     * @throws {InvalidArgumentException} If an invalid instance name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.cache');
    }

    /**
     * Checks if a cache instance matching a given name has been registered or not.
     *
     * @param {string} name A string containing the instance name.
     *
     * @returns {boolean} If the cache instance exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid instance name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.cache');
    }

    /**
     * Returns the cache instance matching a given name.
     *
     * @param {string} name A string containing the instance name.
     *
     * @returns {(Cache|null)} An instance of the class "Cache", if no instance is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid instance name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.cache');
    }

    /**
     * Returns all the cache instances that have been registered.
     *
     * @returns {{string: Cache}} An object having as key the instance name and as value the cache instance itself.
     */
    static getAll(){
        return super.getAll('com.lala.cache');
    }
}

module.exports = CacheRepository;