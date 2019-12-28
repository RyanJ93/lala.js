'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Cache = require('../Cache');
const CacheDriver = require('../CacheDriver');
const ConnectionRepository = require('../../Database/ConnectionRepository');
const MemcachedConnection = require('../../Database/connections/MemcachedConnection');
const MemcachedClusteredConnection = require('../../Database/connections/MemcachedClusteredConnection');
const {
    InvalidArgumentException,
    MisconfigurationException,
    DriverNotDefinedException,
    DriverNotConnectedException,
    DuplicateEntryException,
    RuntimeException,
    UnresolvedDependencyException
} = require('../../Exceptions');

/**
 * @type {object} _memcached An object representing the Memcached driver.
 *
 * @private
 */
let _memcached = null;
try{
    // Try importing required external module (if it has been installed).
    _memcached = require('memcached');
}catch{
    Logger.log('Failed loading "memcached" module.', 2);
}

/**
 * The built-in cache driver for the Memcached storage engine.
 */
class MemcachedCacheDriver extends CacheDriver {
    /**
     * Sets up the driver from the configuration file loaded, currently not supported.
     *
     * @returns {Promise<boolean>}
     *
     * @async
     */
    static async setup(){
        return true;
    }

    /**
     * Registers a new connection to a Memcached server or cluster that will be available globally.
     *
     * @param {string} name A string containing the name that identifies the connection.
     * @param {(MemcachedConnection|MemcachedClusteredConnection)} connection An instance of the class "MemcachedConnection" representing the connection with the Memcached server, if a cluster is going to be connected, an instance of the class "MemcachedClusteredConnection" is expected instead.
     * @param {boolean} [overwrite=false] If set to "true" it means that if the connection has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name were given.
     * @throws {InvalidArgumentException} If an invalid connection object were given.
     */
    static addConnection(name, connection, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( !connection instanceof MemcachedConnection && !connection instanceof MemcachedClusteredConnection ){
            throw new InvalidArgumentException('Invalid connection object.', 2);
        }
        ConnectionRepository.register('memcached', name, connection, overwrite);
    }

    /**
     * The class constructor.
     *
     * @throws {UnresolvedDependencyException} If the required third part module "memcached" has not been installed.
     */
    constructor(){
        super();
        if ( _memcached === null ){
            throw new UnresolvedDependencyException('The required Memcached module has not been installed, run "npm i memcached" first.', 1);
        }

        // Get the default connection defined, if not found, it will be set to null, allowing to be defined as soon as possible after class instance.
        this._connection = Cache.getDefaultDriverConnection('memcached');
    }

    /**
     * Sets the connection to use, this method is chainable.
     *
     * @param {(string|MemcachedConnection|MemcachedClusteredConnection|null)} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @return {MemcachedCacheDriver}
     *
     * @throws {MisconfigurationException} If no default connection is found.
     * @throws {InvalidArgumentException} If no connection matching the given name is found.
     * @throws {InvalidArgumentException} If an invalid connection object is given.
     */
    setConnection(connection){
        if ( connection === null ){
            // No connection has been defined, getting the default one.
            const obj = Cache.getDefaultDriverConnection('memcached');
            if ( obj === null ){
                throw new MisconfigurationException('No default connection found.', 1);
            }
            this._connection = obj;
            return this;
        }
        if ( connection !== '' && typeof connection === 'string' ){
            // Getting the connection matching the given name (it must have been registered).
            const obj = ConnectionRepository.get('memcached', connection);
            if ( obj === null ){
                throw new InvalidArgumentException('Connection not found.', 2);
            }
            this._connection = obj;
            return this;
        }
        if ( !connection instanceof MemcachedConnection && !connection instanceof MemcachedClusteredConnection ){
            throw new InvalidArgumentException('Invalid connection object.', 3);
        }
        // Setting the given connection object.
        this._connection = connection;
        return this;
    }

    /**
     * Returns the connection that will be used.
     *
     * @return {(MemcachedConnection|null)} An instance of the class "MemcachedConnection" representing the Memcached connection, if no connection has been defined, null will be returned instead.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Saves an entry within the cache.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {*} value The value that will be cached.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {(number|null)} [options.ttl=null] An integer number greater than zero representing the duration of the element in seconds.
     * @param {boolean} [options.overwrite=false] If set to "true" and if the item already exists, it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to Memcached has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to Memcached.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {DuplicateEntryException} If the given key were found and the "overwrite" option wasn't set to "true".
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async set(key, value, options){
        key = this.prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        let ttl = this.getComputedTTL(options);
        if ( ttl === null ){
            ttl = 0;
        }
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        await (new Promise((resolve, reject) => {
            if ( options.overwrite ){
                // As the set command will replace any existing entry, this will be the right choice to set and eventually replace an item.
                this._connection.getConnection().set(key, value, ttl, (error) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 5, error));
                    }
                    resolve();
                });
            }else{
                // Set the value if it doesn't exist already.
                this._connection.getConnection().add(key, value, ttl, (error) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(error.notStored === true ? new DuplicateEntryException('Key already existing.', 4) : error);
                    }
                    resolve();
                });
            }
        }));
    }

    /**
     * Returns an entry matching the given identifier key.
     *
     * @param {string} key A string representing the element key.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {boolean} [options.silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
     *
     * @returns {Promise<*>} The entry's value found or null if no entry was found and the "silent" was set to "true".
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async get(key, options){
        key = this.prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        return await (new Promise((resolve, reject) => {
            this._connection.getConnection().get(key, (error, data) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                // If the item doesn't exist, it wll be returned as an undefined value.
                if ( typeof data === 'undefined' && options.silent !== true ){
                    return reject(new InvalidArgumentException('Undefined key.', 2));
                }
                resolve(typeof data === 'undefined' ? null : data);
            });
        }));
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the element's key.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async exists(key, options){
        key = this.prepareTransaction(key);
        return await (new Promise((resolve, reject) => {
            // As not "exists" command is shipped along Memcached we need to get the entire element.
            this._connection.getConnection().get(key, (error, item) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                // If the element's value is undefined, it doesn't exist
                resolve(typeof item !== 'undefined');
            });
        }));
    }

    /**
     * Sets or alter the expiration date, namely TTL, of a given item.
     *
     * @param {string} key A string representing the element's key.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, this item will last forever.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid key were given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async expire(key, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 1);
        }
        if ( expire === null ){
            expire = 0;
        }
        key = this.prepareTransaction(key);
        return await (new Promise((resolve, reject) => {
            // Alter the element's TTL by "touching" it, if it must persist, then set an empty TTL, so 0.
            this._connection.getConnection().touch(key, expire, (error) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                resolve();
            });
        }));
    }

    /**
     * Removes an entry from the cache.
     *
     * @param {string} key A string representing the element's key.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async remove(key, options){
        key = this.prepareTransaction(key);
        await (new Promise((resolve, reject) =>{
            this._connection.getConnection().del(key, (error) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                resolve();
            });
        }));
    }

    /**
     * Drops all the entries stored within the cache, note that, due to Memcached's design, this method will remove all the elements stored, mo mather the namespace.
     *
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async invalidate(options){
        await (new Promise((resolve, reject) =>{
            // As there isn't a method that allows to remove a group of item given a regex neither a method to fetch all the stored keys, we need to empty the entire _storage.
            this._connection.getConnection().flush((error) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                resolve();
            });
        }));
    }

    /**
     * Increments the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {(number|null)} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async increment(key, value = 1, options){
        key = this.prepareTransaction(key);
        value = value === null || isNaN(value) ? 1 : value;
        // Incrementing and decrementing an item by a floating point delta is not supported, so we need to ensure the delta to be an integer number.
        value  = Math.floor(value);
        if ( value === 0 ){
            return;
        }
        if ( value > 0 ){
            await (new Promise((resolve, reject) =>{
                this._connection.getConnection().incr(key, value, (error) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                    }
                    resolve();
                });
            }));
            return;
        }
        // Decrementing an item by invoking the "incr" using a negative number is not allowed, so use the "decr" method with a positive one.
        await (new Promise((resolve, reject) =>{
            this._connection.getConnection().decr(key, -value, (error) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                resolve();
            });
        }));
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {(number|null)} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async decrement(key, value = 1, options){
        const increment = value === null || isNaN(value) ? -1 : -value;
        await this.increment(key, increment, options);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {{string: *}} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {(number|null)} [options.ttl=null] An integer number greater than zero representing the duration of each element in seconds.
     * @param {boolean} [options.overwrite=false] If set to "true" and if an item already exists, it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid object containing the items to store is given.
     * @throws {DuplicateEntryException} If one of the given keys were found and the "overwrite" option wasn't set to "true".
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async setMulti(items, options){
        if ( items === null || typeof items !== 'object' ){
            throw new InvalidArgumentException( 'Invalid items object.', 1 );
        }
        // Ensure the connection to the storage engine and prepare the keys.
        const keys = Object.keys(items);
        const processedKeys = this.prepareMultipleTransaction(keys);
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        let ttl = this.getComputedTTL(options);
        if ( ttl === null ){
            ttl = 0;
        }
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        let processes = [];
        const connection = this._connection.getConnection();
        const length = keys.length;
        // As there isn't a command such "setMulti" neither transactions support, send a single set command for each item.
        if ( options.overwrite ){
            for ( let i = 0 ; i < length ; i++ ){
                if ( items.hasOwnProperty(keys[i]) ) {
                    processes.push(new Promise((resolve, reject) => {
                        connection.set(processedKeys[i], items[keys[i]], ttl, (error) => {
                            if ( typeof error !== 'undefined' ){
                                return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 5, error));
                            }
                            resolve();
                        });
                    }));
                }
            }
        }else{
            for ( let i = 0 ; i < length ; i++ ){
                if ( items.hasOwnProperty(keys[i]) ) {
                    processes.push(new Promise((resolve, reject) => {
                        connection.add(processedKeys[i], items[keys[i]], ttl, (error) => {
                            if ( typeof error !== 'undefined' ){
                                if ( error.notStored === true ){
                                    return reject(new DuplicateEntryException('Key already existing.', 4));
                                }
                                return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 5, error));
                            }
                            resolve();
                        });
                    }));
                }
            }
        }
        // Execute all the commands in parallel.
        await Promise.all(processes);
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {boolean} [options.silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If one of the given key was not found.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async getMulti(keys, options){
        // Ensure the connection to the storage engine and prepare the keys.
        const processedKeys = this.prepareMultipleTransaction(keys);
        let references = {};
        const length = processedKeys.length;
        for ( let i = 0 ; i < length ; i++ ){
            references[processedKeys[i]] = keys[i];
        }
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        return await new Promise((resolve, reject) => {
            let entries = {};
            this._connection.getConnection().getMulti(processedKeys, (error, items) => {
                if ( typeof error !== 'undefined' ){
                    return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                }
                for ( let key in references ){
                    // Preparing the object to return having as key the original key.
                    if ( references.hasOwnProperty(key) ){
                        if ( !items.hasOwnProperty(key) ){
                            if ( options.silent !== true ){
                                return reject(new InvalidArgumentException('Undefined key.', 2));
                            }
                            entries[references[key]] = null;
                            continue;
                        }
                        entries[references[key]] = items[key];
                    }
                }
                resolve(entries);
            });
        });
    }

    /**
     * Checks if multiple given elements exist.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {boolean} [all=false] If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<boolean|{string: boolean}>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Memcached side.
     *
     * @async
     */
    async existsMulti(keys, all, options){
        // Ensure the connection to the storage engine and prepare the keys.
        const processedKeys = this.prepareMultipleTransaction(keys);
        if ( all === true ){
            return await new Promise((resolve, reject) => {
                this._connection.getConnection().getMulti(processedKeys, (error, items) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(new RuntimeException('Unable to complete the operation on the Memcached side.', 3, error));
                    }
                    items = Object.values(items);
                    if ( items.length === 0 ){
                        return resolve(false);
                    }
                    for ( let i = 0 ; i < items.length ; i++ ){
                        if ( typeof items[i] === 'undefined' ){
                            return resolve(false);
                        }
                    }
                    resolve(true);
                });
            });
        }
        let references = {};
        processedKeys.forEach((key, index) => {
            references[key] = keys[index];
        });
        return await new Promise((resolve, reject) => {
            this._connection.getConnection().getMulti(processedKeys, (error, items) => {
                if ( typeof error !== 'undefined' ){
                    return reject(error);
                }
                let elements = {};
                // Prepare the object to return having as key the original item key and as value a boolean.
                for ( let key in references ){
                    if ( references.hasOwnProperty(key) ){
                        elements[references[key]] = items.hasOwnProperty(key);
                    }
                }
                resolve(elements);
            });
        });
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     *
     * @async
     */
    async removeMulti(keys, options){
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        keys.forEach((key) => {
            processes.push(new Promise((resolve, reject) => {
                connection.del(key, (error) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(error);
                    }
                    resolve();
                });
            }));
        });
        await Promise.all(processes);
    }

    /**
     * Increments the value of multiple elements by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {(number|null)} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     *
     * @async
     */
    async incrementMulti(keys, value = 1, options){
        value = Math.floor(value);
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        if ( value > 0 ){
            keys.forEach((key) => {
                processes.push(new Promise((resolve, reject) => {
                    connection.incr(key, value, (error) => {
                        if ( typeof error !== 'undefined' ){
                            return reject(error);
                        }
                        resolve();
                    });
                }));
            });
            await Promise.all(processes);
            return;
        }
        value = -value;
        keys.forEach((key) => {
            processes.push(new Promise((resolve, reject) => {
                connection.decr(key, value, (error) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(error);
                    }
                    resolve();
                });
            }));
        });
        await Promise.all(processes);
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {(number|null)} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     *
     * @async
     */
    async decrementMulti(keys, value = 1, options){
        let increment = value === null || isNaN(value) ? -1 : -value;
        await this.incrementMulti(keys, increment, options);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of multiple elements.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, these items will last forever.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Memcached server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Memcached server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     *
     * @async
     */
    async expireMulti(keys, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        if ( expire === null ){
            expire = 0;
        }
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        keys.forEach((key) => {
            processes.push(new Promise((resolve, reject) => {
                connection.touch(key, expire, (error) => {
                    if ( typeof error !== 'undefined' ){
                        return reject(error);
                    }
                    resolve();
                });
            }));
        });
        await Promise.all(processes);
    }

    /**
     * Does nothing, just avoid warning as this method wasn't overridden after extending the "CacheDriver" class.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async init() {}
}

module.exports = MemcachedCacheDriver;
