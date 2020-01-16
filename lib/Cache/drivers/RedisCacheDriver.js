'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Cache = require('../Cache');
const CacheDriver = require('../CacheDriver');
const ConnectionRepository = require('../../Database/ConnectionRepository');
const RedisConnection = require('../../Database/connections/RedisConnection');
const RedisClusteredConnection = require('../../Database/connections/RedisClusteredConnection');
const {
    InvalidArgumentException,
    MisconfigurationException,
    DriverNotDefinedException,
    DriverNotConnectedException,
    DuplicateEntryException,
    RuntimeException,
    UnresolvedDependencyException,
    SerializationException
} = require('../../Exceptions');

/**
 * @typedef {CacheSetOptions} CacheRedisSetOptions The options accepted by the Redis driver during "set" operations.
 *
 * @property {?number} [ttl] An integer number greater than zero representing the duration of the element in seconds.
 * @property {boolean} overwrite If set to "true" and if the item already exists, it will be overwritten, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheGetOptions} CacheRedisGetOptions The options accepted by the Redis driver during "get" operations.
 *
 * @property {boolean} [silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
 */

/**
 * @typedef {CacheExistsOptions} CacheRedisExistsOptions The options accepted by the Redis driver during "exists" operations.
 */

/**
 * @typedef {CacheExpireOptions} CacheRedisExpireOptions The options accepted by the Redis driver during "expire" operations.
 */

/**
 * @typedef {CacheRemoveOptions} CacheRedisRemoveOptions The options accepted by the Redis driver during "remove" operations.
 */

/**
 * @typedef {CacheInvalidateOptions} CacheRedisInvalidateOptions The options accepted by the Redis driver during "invalidate" operations.
 */

/**
 * @typedef {CacheIncrementOptions} CacheRedisIncrementOptions The options accepted by the Redis driver during "increment" operations.
 */

/**
 * @typedef {CacheDecrementOptions} CacheRedisDecrementOptions The options accepted by the Redis driver during "decrement" operations.
 */

/**
 * @typedef {CacheSetMultiOptions} CacheRedisSetMultiOptions The options accepted by the Redis driver during multiple "set" operations.
 *
 * @property {?number} [ttl] An integer number greater than zero representing the duration of each element in seconds.
 * @property {boolean} [overwrite=false] If set to "true" and if an item already exists, it will be overwritten, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheGetMultiOptions} CacheRedisGetMultiOptions The options accepted by the Redis driver during multiple "get" operations.
 *
 * @property {boolean} [silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
 */

/**
 * @typedef {CacheExistsMultiOptions} CacheRedisExistsMultiOptions The options accepted by the Redis driver during multiple "exists" operations.
 */

/**
 * @typedef {CacheRemoveMultiOptions} CacheRedisRemoveMultiOptions The options accepted by the Redis driver during multiple "remove" operations.
 */

/**
 * @typedef {CacheIncrementMultiOptions} CacheRedisIncrementMultiOptions The options accepted by the Redis driver during multiple "increment" operations.
 */

/**
 * @typedef {CacheDecrementMultiOptions} CacheRedisDecrementMultiOptions The options accepted by the Redis driver during multiple "decrement" operations.
 */

/**
 * @typedef {CacheExpireMultiOptions} CacheRedisExpireMultiOptions The options accepted by the Redis driver during multiple "expire" operations.
 */

/**
 * @type {object} _redis An object representing the Redis driver.
 *
 * @private
 */
let _redis = null;
try{
    // Try importing required external module (if it has been installed).
    _redis = require('redis');
}catch{
    Logger.log('Failed loading "redis" module.', 2);
}

/**
 * The built-in cache driver for the Redis storage engine.
 */
class RedisCacheDriver extends CacheDriver {
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
     * Registers a new connection to a Redis server or cluster that will be available globally.
     *
     * @param {string} name A string containing the name that identifies the connection.
     * @param {RedisConnection} connection An instance of the class "RedisConnection" representing the connection with the Redis server.
     * @param {boolean} [overwrite=false]  If set to "true" it means that if the connection has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name were given.
     * @throws {InvalidArgumentException} If an invalid connection object were given.
     */
    static addConnection(name, connection, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( !connection instanceof RedisConnection ){
            throw new InvalidArgumentException('Invalid connection object.', 2);
        }
        ConnectionRepository.register('redis', name, connection, overwrite);
    }

    /**
     * The class constructor.
     *
     * @throws {UnresolvedDependencyException} If the required third part module "redis" has not been installed.
     */
    constructor(){
        super();
        if ( _redis === null ){
            throw new UnresolvedDependencyException('The required Redis module has not been installed, run "npm i redis" first.', 1);
        }

        // Get the default connection defined, if not found, it will be set to null, allowing to be defined as soon as possible after class instance.
        this._connection = Cache.getDefaultDriverConnection('redis');
    }

    /**
     * Sets the connection to use, this method is chainable.
     *
     * @param {string|RedisConnection|RedisClusteredConnection|null} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @return {RedisCacheDriver}
     *
     * @throws {MisconfigurationException} If no default connection is found.
     * @throws {InvalidArgumentException} If no connection matching the given name is found.
     * @throws {InvalidArgumentException} If an invalid connection object is given.
     */
    setConnection(connection){
        if ( connection === null ){
            // No connection has been defined, getting the default one.
            const obj = Cache.getDefaultDriverConnection('redis');
            if ( obj === null ){
                throw new MisconfigurationException('No default connection found.', 1);
            }
            this._connection = obj;
            return this;
        }
        if ( connection !== '' && typeof connection === 'string' ){
            // Getting the connection matching the given name (it must have been registered).
            const obj = ConnectionRepository.get('redis', connection);
            if ( obj === null ){
                throw new InvalidArgumentException('Connection not found.', 2);
            }
            this._connection = obj;
            return this;
        }
        if ( !connection instanceof RedisConnection && !connection instanceof RedisClusteredConnection ){
            throw new InvalidArgumentException('Invalid connection object.', 3);
        }
        // Setting the given connection object.
        this._connection = connection;
        return this;
    }

    /**
     * Returns the connection that will be used.
     *
     * @return {RedisConnection|null} An instance of the class "RedisConnection" representing the Redis connection, if no connection has been defined, null will be returned instead.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Saves an entry within the cache.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {*} value The value that will be cached.
     * @param {?CacheRedisSetOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {DuplicateEntryException} If the given key were found and the "overwrite" option wasn't set to "true".
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     * @throws {SerializationException} If some non-serializable data where found, such as big integers that are currently not supported.
     *
     * @async
     */
    set(key, value, options = null){
        key = this.prepareTransaction(key, options);
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        const ttl = this.getComputedTTL(options);
        let json;
        try{
            // Serialize the original value into a JSON representation.
            json = JSON.stringify(value);
        }catch(ex){
            throw new SerializationException('Unsupported data found.', 6, ex);
        }
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        return new Promise((resolve, reject) => {
            const connection = this._connection.getConnection();
            let params = [key, json];
            if ( ttl !== null ){
                params[2] = 'EX';
                params[3] = ttl;
            }
            if ( !options.overwrite ){
                params.push('NX');
            }
            connection.set(...params, (error, reply) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 5, error));
                }
                if ( !options.overwrite && reply !== 1 && reply !== 'OK' ){
                    return reject(new DuplicateEntryException('Key already existing.', 4));
                }
                resolve();
            });
        });
    }

    /**
     * Returns an entry matching the given identifier key.
     *
     * @param {string} key A string representing the element key.
     * @param {?CacheRedisGetOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<*>} The entry's value found or null if no entry was found and the "silent" was set to "true".
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     * @throws {SerializationException} If data received from Redis is not a valid JSON string.
     *
     * @async
     */
     get(key, options = null){
        key = this.prepareTransaction(key, options);
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        return new Promise((resolve, reject) => {
            // Send the "GET" command to the Redis server.
            this._connection.getConnection().get(key, (error, data) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 4, error));
                }
                if ( data === null && options.silent !== true ){
                    return reject(new InvalidArgumentException('Undefined key.', 3));
                }
                try{
                    if ( data !== null ){
                        data = JSON.parse(data);
                    }
                    resolve(data);
                }catch(ex){
                    reject(new SerializationException('Data received from Redis seems to be malformed.', 5, ex));
                }
            });
        });
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the element's key.
     * @param {?CacheRedisExistsOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    exists(key, options = null) {
        key = this.prepareTransaction(key, options);
        return new Promise((resolve, reject) => {
            // Send the "EXISTS" command to the Redis server.
            this._connection.getConnection().exists(key, ( error, result) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                }
                resolve(result !== 0);
            });
        });
    }

    /**
     * Sets or alter the expiration date, namely TTL, of a given item.
     *
     * @param {string} key A string representing the element's key.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, this item will last forever.
     * @param {?CacheRedisExpireOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid key were given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    expire(key, expire, options = null){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        key = this.prepareTransaction(key, options);
        return new Promise((resolve, reject) => {
            if ( expire === null || expire === 0 ){
                // If an empty expire time has been given, then send the "PERSIST" command to the Redis server in order to discard previous TTL.
                this._connection.getConnection().persist(key, (error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 5, error));
                    }
                    resolve();
                });
            }else{
                // send the "EXPIRE" command to the Redis server in order to update current TTL.
                this._connection.getConnection().expire(key, expire, (error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 5, error));
                    }
                    resolve();
                });
            }
        });
    }

    /**
     * Removes an entry from the cache.
     *
     * @param {string} key A string representing the element's key.
     * @param {?CacheRedisRemoveOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    remove(key, options = null){
        key = this.prepareTransaction(key, options);
        return new Promise((resolve, reject) => {
            // Send the "DEL" command to the Redis server.
            this._connection.getConnection().del(key, (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                }
                resolve();
            });
        });
    }

    /**
     * Drops all the entries stored within the cache.
     *
     * @param {?CacheRedisInvalidateOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    invalidate(options = null){
        this.ensureConnection();
        const pattern = CacheDriver.getGlobalPrefix() + ':' + this._getComputedNamespace(options);
        const connection = this._connection.getConnection();
        //OPTIMIZE: Consider a better implementation.
        return new Promise((resolve, reject) => {
            // Grab all the keys matching the framework signature and the namespace defined.
            connection.keys(pattern + ':*', (error, elements) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                }
                // Start a command queue allowing to execute all delete operations at once.
                let session = connection.multi();
                // Delete all the entries found one by one.
                const length = elements.length;
                for ( let i = 0 ; i < length ; i++ ){
                    session.del(elements[i]);
                }
                // Execute the created queue.
                session.exec((error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                    }
                    resolve();
                });
            });
        });
    }

    /**
     * Increments the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheRedisIncrementOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    increment(key, value = null, options = null){
        key = this.prepareTransaction(key, options);
        value = value === null || isNaN(value) ? 1 : value;
        return new Promise((resolve, reject) => {
            if ( value !== 0 ){
                // Send the "INCRBYFLOAT" command to the Redis server.
                this._connection.getConnection().incrbyfloat(key, value, (error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                    }
                    resolve();
                });
            }else{
                resolve();
            }
        });
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {?CacheRedisDecrementOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    decrement(key, value, options = null){
        return this.increment(key, ( value === null || isNaN(value) ? -1 : -value ), options);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {object} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {?CacheRedisSetMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid object containing the items to store is given.
     * @throws {DuplicateEntryException} If one of the given keys were found and the "overwrite" option wasn't set to "true".
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     * @throws {SerializationException} If some non-serializable data where found, such as big integers that are currently not supported.
     *
     * @async
     */
    setMulti(items, options = null){
        if ( items === null || typeof items !== 'object' ){
            throw new InvalidArgumentException('Invalid items object.', 1);
        }
        // Ensure the connection to the storage engine and prepare the keys.
        const keys = Object.keys(items);
        const processedKeys = this.prepareMultipleTransaction(keys, options);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        const ttl = this.getComputedTTL(options);
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        // Populate the transaction.
        const length = keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            let json;
            try{
                // Serialize the original value into a JSON representation.
                json = JSON.stringify(items[keys[i]]);
            }catch(ex){
                throw new SerializationException('Unsupported data found.', 6, ex);
            }
            if ( items.hasOwnProperty(keys[i]) ){
                if ( options.overwrite ){
                    if ( ttl !== null ){
                        session.set(processedKeys[i], json, 'EX', ttl);
                        continue;
                    }
                    session.set(processedKeys[i], json);
                    continue;
                }
                if ( ttl !== null ){
                    session.set(processedKeys[i], json, 'EX', ttl, 'NX');
                    continue;
                }
                session.set(processedKeys[i], json, 'NX');
            }
        }
        return new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error, replies) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 5, error));
                }
                if ( options.overwrite ){
                    resolve();
                }
                const length = replies.length;
                for ( let i = 0 ; i < length ; i++ ){
                    if ( replies[i] !== 1 && replies[i] !== 'OK' ){
                        return reject(new DuplicateEntryException('Key already existing.', 4));
                    }
                }
                resolve();
            });
        });
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?CacheRedisGetMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If one of the given key was not found.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     * @throws {SerializationException} If data received from Redis is not a valid JSON string.
     *
     * @async
     */
    getMulti(keys, options = null){
        // Ensure the connection to the storage engine and prepare the keys.
        const processedKeys = this.prepareMultipleTransaction(keys, options);
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        const length = processedKeys.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Add the "GET" command invocation to the queue.
            session.get(processedKeys[i]);
        }
        return new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error, elements) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                }
                const length = keys.length;
                let items = {};
                // Preparing the object to return having as key the original key.
                for ( let i = 0 ; i < length ; i++ ){
                    if ( typeof elements[i] === 'undefined' && options.silent !== true ){
                        return reject(new InvalidArgumentException('Undefined key.', 2));
                    }
                    try{
                        // Recover original data according to its serialized representation.
                        items[keys[i]] = typeof elements[i] !== 'undefined' ? JSON.parse(elements[i]) : null;
                    }catch(ex){
                        throw new SerializationException('Data received from Redis seems to be malformed.', 4, ex);
                    }
                }
                resolve(items);
            });
        });
    }

    /**
     * Checks if multiple given elements exist.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {boolean} [all=false] If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {?CacheRedisExistsMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<boolean|object>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    existsMulti(keys, all = false, options = null){
        // Ensure the connection to the storage engine and prepare the keys.
        const processedKeys = this.prepareMultipleTransaction(keys, options);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        const length = processedKeys.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Add the "EXISTS" command invocation to the queue.
            session.exists(processedKeys[i]);
        }
        return new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error, elements) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                }
                const length = elements.length;
                if ( all === true ){
                    // Check if all the keys exists.
                    for ( let i = 0 ; i < length ; i++ ){
                        if ( elements[i] !== 1 ){
                            return resolve(false);
                        }
                    }
                    return resolve(true);
                }
                // Prepare the object to return having as key the original item key and as value a boolean.
                let items = {};
                for ( let i = 0 ; i < length ; i++ ){
                    items[keys[i]] = elements[i] === 1;
                }
                resolve(items);
            });
        });
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?CacheRedisRemoveMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    removeMulti(keys, options = null){
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys, options);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        const length = keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Add the "DEL" command invocation to the queue.
            session.del(keys[i]);
        }
        return new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                }
                resolve();
            });
        });
    }

    /**
     * Increments the value of multiple elements by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheRedisIncrementMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    incrementMulti(keys, value, options = null){
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys, options);
        value = value === null || isNaN(value) ? 1 : value;
        return new Promise((resolve, reject) => {
            if ( value !== 0 ){
                // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
                let session = this._connection.getConnection().multi();
                const length = keys.length;
                for ( let i = 0 ; i < length ; i++ ){
                    // Add the "INCRBYFLOAT" command invocation to the queue.
                    session.incrbyfloat(keys[i], value);
                }
                // Execute the command batch.
                session.exec((error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 3, error));
                    }
                    resolve();
                });
            }else{
                resolve();
            }
        });
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {?CacheRedisDecrementMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    decrementMulti(keys, value, options = null){
        return this.incrementMulti(keys, ( value === null || isNaN(value) ? -1 : -value ), options);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of multiple elements.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, these items will last forever.
     * @param {?CacheRedisExpireMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a Redis server has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the Redis server.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     * @throws {RuntimeException} If an error occurs during the operation on the Redis side.
     *
     * @async
     */
    expireMulti(keys, expire, options = null){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys, options);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        const length = keys.length;
        if ( expire === null || expire === 0 ){
            for ( let i = 0 ; i < length ; i++ ){
                // Add the "PERSIST" command invocation to the queue.
                session.persist(keys[i]);
            }
        }else{
            for ( let i = 0 ; i < length ; i++ ){
                // Add the "EXPIRE" command invocation to the queue.
                session.expire(keys[i], expire);
            }
        }
        return new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the Redis side.', 5, error));
                }
                resolve();
            });
        });
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

module.exports = RedisCacheDriver;
