'use strict';

// Including Lala's modules.
const Config = require('../../Config/Config');
const Logger = require('../../Logger/Logger');
const Cache = require('../Cache');
const CacheDriver = require('../CacheDriver');
const RedisConnection = require('../../Database/connections/RedisConnection');
const RedisClusteredConnection = require('../../Database/connections/RedisClusteredConnection');
const {
    InvalidArgumentException,
    MisconfigurationException,
    DriverNotDefinedException,
    DriverNotConnectedException,
    DuplicateEntryException
} = require('../../Exceptions');

/**
 * @type {object} _redis An object representing the Redis driver.
 *
 * @private
 */
let _redis = null;
try{
    // Try importing required external module (if it has been installed).
    _redis = require('redis');
}catch(ex){
    Logger.log('Failed loading "redis" module.', 2);
}

class RedisCacheDriver extends CacheDriver {
    /**
     * Sets up the driver by loading and instantiating connections from configuration file.
     *
     * @returns {Promise<boolean>}
     *
     * @async
     */
    static async setup(){
        if ( _redis === null ){
            return false;
        }
        let cache = Config.getProperty('cache');
        if ( cache === null || cache._connections === null || typeof cache._connections !== 'object' ){
            return true;
        }
        for ( let i = 0 ; i < cache._connections.length ; i++ ){
            let driver = cache._connections[i];
            // Ignoring configuration block that are not referred to Redis driver.
            if ( driver === null || typeof driver !== 'object' || driver.type !== 'redis' ){
                continue;
            }
            if ( driver.name === '' || typeof driver.name !== 'string' ){
                continue;
            }
            try{
                if ( Array.isArray(driver.cluster) && driver.cluster.length > 0 ){
                    // Generating a clustered connection class containing all the defined connections to the nodes.
                    let cluster = await RedisClusteredConnection.createFromConfigBlock(driver.cluster);
                    if ( cluster.hasConnections() ){
                        await cluster.connect();
                        RedisCacheDriver.addConnection(driver.name, cluster);
                    }
                    continue;
                }
                // Generating the connection class instance from the configuration block.
                let connection = RedisConnection.createFromConfigBlock(driver);
                // Establish the connection.
                await connection.connect();
                // Register the connection globally.
                RedisCacheDriver.addConnection(driver.name, connection);
            }catch(ex){}
        }
        return true;
    }

    /**
     * Registers a new connection to a Redis server or cluster that will be available globally.
     *
     * @param {string} name A string containing the name that identifies the connection.
     * @param {RedisConnection} connection An instance of the class "RedisConnection" representing the connection with the Redis server.
     *
     * @throws InvalidArgumentException If an invalid name were given.
     * @throws InvalidArgumentException If an invalid connection object were given.
     */
    static addConnection(name, connection){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( !connection instanceof RedisConnection ){
            throw new InvalidArgumentException('Invalid connection object.', 2);
        }
        Cache.addConnection('redis', name, connection);
    }

    static removeConnection(name){
        //TODO: Implement this method.
    }

    /**
     * The class constructor.
     */
    constructor(){
        super();
        this.setConnection(null);
    }

    /**
     * Sets the connection to use, this method is chainable.
     *
     * @param {string|RedisConnection|RedisClusteredConnection|null} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @return {RedisCacheDriver}
     *
     * @throws MisconfigurationException If no default connection is found.
     * @throws InvalidArgumentException If no connection matching the given name is found.
     * @throws InvalidArgumentException If an invalid connection object is given.
     */
    setConnection(connection){
        if ( connection === null ){
            // No connection has been defined, getting the default one.
            connection = Cache.getConnection('redis', null);
            if ( connection === null ){
                throw new MisconfigurationException('No default connection found.', 1);
            }
            this._connection = connection;
            return this;
        }
        if ( connection !== '' && typeof connection === 'string' ){
            // Getting the connection matching the given name (it must have been registered.).
            connection = Cache.getConnection('redis', connection);
            if ( connection === null ){
                throw new InvalidArgumentException('Connection not found.', 2);
            }
            this._connection = connection;
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
     * @param {any} value The value that will be cached.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws DuplicateEntryException If the given key were found and the "overwrite" option wasn't set to "true".
     *
     * @async
     */
     async set(key, value, options){
        key = this.prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        let ttl = this.getComputedTTL(options);
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        await (new Promise((resolve, reject) => {
            let connection = this._connection.getConnection();
            let params = [key, value];
            if ( ttl !== null ){
                params[2] = 'EX';
                params[3] = ttl;
            }
            if ( !options.overwrite ){
                params.push('NX');
            }
            connection.set(...params, (error, reply) => {
                if ( error !== null ){
                    return reject(error);
                }
                if ( !options.overwrite && reply !== 1 && reply !== 'OK' ){
                    return reject(new DuplicateEntryException('Key already existing.', 4));
                }
                resolve();
            });
        }));
    }

    /**
     * Returns an entry matching the given identifier key.
     *
     * @param {string} key A string representing the element key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<any>} The entry's value found or null if no entry was found and the "silent" was set to "true".
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
     async get(key, options){
        key = this.prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        return await (new Promise((resolve, reject) => {
            // Send the "GET" command to the Redis server.
            this._connection.getConnection().get(key, ( error, data) => {
                if ( error !== null ){
                    return reject(error);
                }
                if ( data === null && options.silent !== true ){
                    return reject(new InvalidArgumentException('Undefined key.', 2));
                }
                resolve(data);
            });
        }));
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async exists(key, options) {
        key = this.prepareTransaction(key);
        return await (new Promise((resolve, reject) => {
            // Send the "EXISTS" command to the Redis server.
            this._connection.getConnection().exists(key, ( error, result) => {
                if ( error !== null ){
                    return reject(error);
                }
                resolve(result !== 0);
            });
        }));
    }

    /**
     * Sets or alter the expiration date, namely TTL, of a given item.
     *
     * @param {string} key A string representing the element's key.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, this item will last forever.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid key were given.
     * @throws InvalidArgumentException If an invalid expiration time is given.
     *
     * @async
     */
    async expire(key, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        key = this.prepareTransaction(key);
        return await (new Promise((resolve, reject) => {
            if ( expire === null || expire === 0 ){
                // If an empty expire time has been given, then send the "PERSIST" command to the Redis server in order to discard previous TTL.
                this._connection.getConnection().persist(key, ( error) => {
                    if ( error !== null ){
                        return reject(error);
                    }
                    resolve();
                });
            }else{
                // send the "EXPIRE" command to the Redis server in order to update current TTL.
                this._connection.getConnection().expire(key, expire, ( error) => {
                    if ( error !== null ){
                        return reject(error);
                    }
                    resolve();
                });
            }
        }));
    }

    /**
     * Removes an entry from the cache.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async remove(key, options){
        key = this.prepareTransaction(key);
        await (new Promise((resolve, reject) => {
            // Send the "DEL" command to the Redis server.
            this._connection.getConnection().del(key, ( error) => {
                if ( error !== null ){
                    return reject(error);
                }
                resolve();
            });
        }));
    }

    /**
     * Drops all the entries stored within the cache.
     *
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     *
     * @async
     */
    async invalidate(options){
        this.ensureConnection();
        let pattern = CacheDriver.getGlobalPrefix();
        if ( this._namespaceHash !== null ){
            // Add the namespace as hexadecimal hash.
            pattern += ':' + this._namespaceHash;
        }
        let client = this._connection.getConnection();
        await (new Promise((resolve, reject) => {
            //TODO: Consider a better implementation considering operation atomicity too.
            // Grab all the keys matching the framework signature and the namespace defined.
            client.keys(pattern + ':*', (error, elements) => {
                if ( error !== null ){
                    return reject(error);
                }
                // Start a command queue allowing to execute all delete operations at once.
                let batch = client.multi();
                // Delete all the entries found one by one.
                elements.forEach((key) => {
                    batch.del(key);
                });
                // Execute the created queue.
                batch.exec((error) => {
                    if ( error !== null ){
                        return reject(error);
                    }
                    resolve();
                });
            });
        }));
    }

    /**
     * Increments the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async increment(key, value = null, options){
        key = this.prepareTransaction(key);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        await (new Promise((resolve, reject) => {
            // Send the "INCRBYFLOAT" command to the Redis server.
            this._connection.getConnection().incrbyfloat(key, value, ( error) => {
                if ( error !== null ){
                    return reject(error);
                }
                resolve();
            });
        }));
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async decrement(key, value, options){
        let increment = value === null || isNaN(value) ? -1 : -value;
        await this.increment(key, increment, options);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {object} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid object containing the items to store is given.
     * @throws DuplicateEntryException If one of the given keys were found and the "overwrite" option wasn't set to "true".
     *
     * @async
     */
    async setMulti(items, options){
        if ( items === null || typeof items !== 'object' ){
            throw new InvalidArgumentException( 'Invalid items object.', 1 );
        }
        // Ensure the connection to the storage engine and prepare the keys.
        let keys = Object.keys(items);
        let processedKeys = this.prepareMultipleTransaction(keys);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        let ttl = this.getComputedTTL(options);
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        // Populate the transaction.
        keys.forEach((key, index) => {
            if ( items.hasOwnProperty(key) ){
                if ( options.overwrite ){
                    if ( ttl !== null ){
                        session.set(processedKeys[index], items[key], 'EX', ttl);
                        return;
                    }
                    session.set(processedKeys[index], items[key]);
                    return;
                }
                if ( ttl !== null ){
                    session.set(processedKeys[index], items[key], 'EX', ttl, 'NX');
                    return;
                }
                session.set(processedKeys[index], items[key], 'NX');
            }
        });
        await (new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error, replies) => {
                if ( error !== null ){
                    return reject(error);
                }
                if ( options.overwrite ){
                    resolve();
                }
                for ( let i = 0 ; i < replies.length ; i++ ){
                    if ( replies[i] !== 1 && replies[i] !== 'OK' ){
                        return reject(new DuplicateEntryException('Key already existing.', 4));
                    }
                }
                resolve();
            });
        }));
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async getMulti(keys, options){
        // Ensure the connection to the storage engine and prepare the keys.
        let processedKeys = this.prepareMultipleTransaction(keys);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        processedKeys.forEach((key) => {
            // Add the "GET" command invocation to the queue.
            session.get(key);
        });
        return await (new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error, elements) => {
                if ( error !== null ){
                    return reject(error);
                }
                let items = {};
                // Preparing the object to return having as key the original key.
                keys.forEach((key, index) => {
                    if ( typeof elements[index] === 'undefined' && options.silent !== true ){
                        return reject(new InvalidArgumentException('Undefined key.', 2));
                    }
                    items[key] = typeof elements[index] !== 'undefined' ? elements[index] : null;
                });
                resolve(items);
            });
        }));
    }

    /**
     * Checks if multiple given elements exist.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {boolean} all If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean|object>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async existsMulti(keys, all = false, options){
        // Ensure the connection to the storage engine and prepare the keys.
        let processedKeys = this.prepareMultipleTransaction(keys);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        processedKeys.forEach((key) => {
            // Add the "EXISTS" command invocation to the queue.
            session.exists(key);
        });
        return await (new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error, elements) => {
                if ( error !== null ){
                    return reject(error);
                }
                if ( all === true ){
                    // Check if all the keys exists.
                    for ( let i = 0 ; i < elements.length ; i++ ){
                        if ( elements[i] !== 1 ){
                            return resolve(false);
                        }
                    }
                    return resolve(true);
                }
                // Prepare the object to return having as key the original item key and as value a boolean.
                let items = {};
                keys.forEach((key, index) => {
                    items[key] = elements[index] === 1;
                });
                resolve(items);
            });
        }));
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async removeMulti(keys, options){
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        keys.forEach((key) => {
            // Add the "DEL" command invocation to the queue.
            session.del(key);
        });
        await (new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error) => {
                if ( error !== null ){
                    return reject(error);
                }
                resolve();
            });
        }));
    }

    /**
     * Increments the value of multiple elements by a given delta.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async incrementMulti(keys, value, options){
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        keys.forEach((key) => {
            // Add the "INCRBYFLOAT" command invocation to the queue.
            session.incrbyfloat(key, value);
        });
        await (new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error) => {
                if ( error !== null ){
                    return reject(error);
                }
                resolve();
            });
        }));
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async decrementMulti(keys, value, options){
        let increment = value === null || isNaN(value) ? -1 : -value;
        await this.incrementMulti(keys, increment, options);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of multiple elements.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, these items will last forever.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a Redis server has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the Redis server.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     * @throws InvalidArgumentException If an invalid expiration time is given.
     *
     * @async
     */
    async expireMulti(keys, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        // Ensure the connection to the storage engine and prepare the keys.
        keys = this.prepareMultipleTransaction(keys);
        // Start a batch session in order to be able to execute all the commands in a single transaction atomically.
        let session = this._connection.getConnection().multi();
        if ( expire === null || expire === 0 ){
            keys.forEach((key) => {
                // Add the "INCRBYFLOAT" command invocation to the queue.
                session.persist(key);
            });
        }else{
            keys.forEach((key) => {
                // Add the "INCRBYFLOAT" command invocation to the queue.
                session.expire(key, expire);
            });
        }
        await (new Promise((resolve, reject) => {
            // Execute the command batch.
            session.exec((error) => {
                if ( error !== null ){
                    return reject(error);
                }
                resolve();
            });
        }));
    }

    /**
     * Does nothing, just avoid warning as this method wasn't overridden after extending the "CacheDriver" class.
     *
     * @returns {Promise<void>}
     */
    async init() {}
}

module.exports = RedisCacheDriver;