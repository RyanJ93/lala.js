'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const LocalCacheDriver = require('./drivers/LocalCacheDriver');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Contains all the installed cache drivers.
 */
class CacheDriverRepository extends Repository {
    /**
     * Registers a new cache driver.
     *
     * @param {string} name A string containing the driver name, it must be unique.
     * @param {function} object The class that implements the driver, note that it must extend the "CacheDriver" class.
     * @param {boolean} overwrite If set to "true" it means that if the driver has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If another driver with the same name has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid driver class is given.
     *
     * @async
     */
    static async register(name, object, overwrite = false){
        if ( typeof object !== 'function' || Object.getPrototypeOf(object).name !== 'CacheDriver' ){
            throw new InvalidArgumentException('Invalid driver class.', 4);
        }
        if ( overwrite !== true && super.has(name, 'com.lala.cache.driver') ){
            throw new InvalidArgumentException('The given object has already been registered.', 3);
        }
        // Call the setup method, if found, to allow the driver to set up connections and variables.
        if ( typeof object.setup === 'function' ){
            // If set up function returns "false" it means that the driver cannot be used.
            if ( await object.setup() === false ){
                return;
            }
        }
        super.register(name, object, 'com.lala.cache.driver', overwrite);
    }

    /**
     * Removes a cache driver that has been registered.
     *
     * @param {string} name A string containing the driver name.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.cache.driver');
    }

    /**
     * Checks if a cache driver matching a given name has been registered or not.
     *
     * @param {string} name A string containing the driver name.
     *
     * @returns {boolean} If the cache driver exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.cache.driver');
    }

    /**
     * Returns the cache driver matching a given name.
     *
     * @param {string} name A string containing the driver name.
     *
     * @returns {(function|null)} The class that implements the cache driver found, if no class is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.cache.driver');
    }

    /**
     * Returns all the cache drivers that have been registered.
     *
     * @returns {{string: function}} An object having as key the object name and as value the cache driver itself.
     */
    static getAll(){
        return super.getAll('com.lala.cache.driver');
    }
}

// If not found, register the local cache driver as it must be the default and fallback cache driver to use.
if ( !CacheDriverRepository.has('local') ){
    Repository.register('local', LocalCacheDriver, 'com.lala.cache.driver', true);
}

module.exports = CacheDriverRepository;