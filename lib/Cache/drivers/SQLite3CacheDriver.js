'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Cache = require('../Cache');
const CacheDriver = require('../CacheDriver');
const ConnectionRepository = require('../../Database/ConnectionRepository');
const SQLite3Connection = require('../../Database/connections/SQLite3Connection');
const {
    InvalidArgumentException,
    MisconfigurationException,
    DriverNotDefinedException,
    DriverNotConnectedException,
    DuplicateEntryException,
    RuntimeException,
    UnresolvedDependencyException
} = require('../../Exceptions');
const { serialize, unserialize } = require('../../helpers');

/**
 * @type {object} _sqlite3 An object representing the SQLite3 driver.
 *
 * @private
 */
let _sqlite3 = null;
try{
    // Try importing required external module (if it has been installed).
    _sqlite3 = require('sqlite3');
}catch(ex){
    Logger.log('Failed loading "sqlite3" module.', 2);
}

/**
 * The built-in driver that allows to store cached data into an SQLite powered database.
 */
class SQLite3CacheDriver extends CacheDriver {
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
     * Registers a new connection to a SQLite database that will be available globally.
     *
     * @param {string} name A string containing the name that identifies the connection.
     * @param {SQLite3Connection} connection An instance of the class "SQLite3Connection" representing the connection with the SQLite database.
     * @param {boolean} [overwrite=false] If set to "true" it means that if the connection has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name were given.
     * @throws {InvalidArgumentException} If an invalid connection object were given.
     */
    static addConnection(name, connection, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( !connection instanceof SQLite3Connection ){
            throw new InvalidArgumentException('Invalid connection object.', 2);
        }
        ConnectionRepository.register('sqlite3', name, connection, overwrite);
    }

    /**
     * Generates a string representation of the expected expire date.
     *
     * @param {(number|null)} ttl An integer number representing the amount of seconds after that the item should expire, if set to null or a value lower or equal than zero, the item will never expire.
     *
     * @returns {(string|null)} A string representation of the expire date in SQL format, if no expire date has been given, null will be returned instead.
     *
     * @private
     */
    static _computeExpireDate(ttl){
        if ( ttl === null || ttl === 0 ){
            return null;
        }
        let date = new Date();
        date.setTime(date.getTime() + ttl);
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    /**
     * The class constructor.
     *
     * @throws {UnresolvedDependencyException} If the required third part module "sqlite3" has not been installed.
     */
    constructor() {
        super();
        if ( _sqlite3 === null ){
            throw new UnresolvedDependencyException('The required SQLite3 module has not been installed, run "npm i sqlite3" first.', 1);
        }

        /**
         * @type {boolean} _ensured If set to "true" it means that the required tables and settings have been ensured and/or created, otherwise initialization will be made before the first transaction.
         *
         * @private
         */
        this._ensured = false;

        /**
         * @type {boolean} _reconnect If set to "true" it means that the database need to be reconnected before the next transaction.
         *
         * @private
         */
        this._reconnect = false;

        // Get the default connection defined, if not found, it will be set to null, allowing to be defined as soon as possible after class instance.
        this._connection = Cache.getDefaultDriverConnection('sqlite3');
    }

    /**
     * Sets the connection to use, this method is chainable.
     *
     * @param {(string|SQLite3Connection|null)} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @return {SQLite3CacheDriver}
     *
     * @throws {MisconfigurationException} If no default connection is found.
     * @throws {InvalidArgumentException} If no connection matching the given name is found.
     * @throws {InvalidArgumentException} If an invalid connection object is given.
     */
    setConnection(connection){
        if ( connection === null ){
            // No connection has been defined, getting the default one.
            const obj = Cache.getDefaultDriverConnection('sqlite3');
            if ( obj === null ){
                throw new MisconfigurationException('No default connection found.', 1);
            }
            this._connection = obj;
            return this;
        }
        if ( connection !== '' && typeof connection === 'string' ){
            // Getting the connection matching the given name (it must have been registered).
            const obj = ConnectionRepository.get('sqlite3', connection);
            if ( obj === null ){
                throw new InvalidArgumentException('Connection not found.', 2);
            }
            this._connection = obj;
            return this;
        }
        if ( !connection instanceof SQLite3Connection ){
            throw new InvalidArgumentException('Invalid connection object.', 3);
        }
        // Setting the given connection object.
        this._connection = connection;
        this._ensured = this._reconnect = false;
        return this;
    }

    /**
     * Returns the connection that will be used.
     *
     * @return {(SQLite3Connection|null)} An instance of the class "SQLite3Connection" representing the database connection, if no connection has been defined, null will be returned instead.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Checks if a connection has been defined and that it is ready to be used.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} if the driver that has been defined is not connected to the cache storage engine.
     *
     * @async
     * @private
     */
    async _ensureConnection(){
        if ( this._connection === null ){
            throw new DriverNotDefinedException('No connection to the cache storage engine has been defined.', 1);
        }
        if ( this._reconnect === true ){
            if ( !this._connection.isConnected() ){
                await this._connection.reconnect();
            }
            this._reconnect = false;
        }
        if ( !this._connection.isConnected() ){
            throw new DriverNotConnectedException('The driver defined is not connected to the cache storage engine.', 2);
        }
    }


    /**
     * Ensures that the required tables exists within the database that has been defined, otherwise it will create them.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the cache storage engine.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     * @private
     */
    async _ensureTables(){
        if ( this._ensured === false ){
            // Checking that a connection has been defined and that is ready to be used.
            await this._ensureConnection();
            await (new Promise((resolve, reject) => {
                // Create the table that will contain the cached items.
                this._connection.getConnection().exec('CREATE TABLE IF NOT EXISTS cache_storage (namespace TEXT, key TEXT, value TEXT, data_type_code INTEGER, date DATETIME, expire DATETIME, PRIMARY KEY (namespace, key));', (error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                    }
                    this._ensured = true;
                    resolve();
                });
            }));
        }
    }

    /**
     * Prepares a database transaction using a given key.
     *
     * @param {string} key A string representing the item key.
     *
     * @returns {string} {{namespace: null|string, key: string, signature: string}} An object containing the generated key components such as the key and the namespace hash.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the cache storage engine.
     * @throws {InvalidArgumentException} If the given key is not valid.
     *
     * @async
     * @private
     */
    async _prepareTransaction(key){
        // Checking that a connection has been defined and that is ready to be used.
        await this._ensureConnection();
        // Ensure that the database has the required tables.
        await this._ensureTables();
        // Generate an hash based on the given key in order to ensure key length and compatibility.
        return this.prepareKeyComponents(key);
    }

    /**
     * Prepares a database transaction and generates the hash of each given key.
     *
     * @param {string[]} keys A sequential array of strings representing the keys to prepare.
     *
     * @returns {{signature: string, keys: Array, namespace: null}} An object containing the generated components including the key hashes.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the cache storage engine.
     * @throws {InvalidArgumentException} If an invalid keys array is given.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     *
     * @async
     * @private
     */
    async _prepareMultipleTransaction(keys){
        // Checking that a connection has been defined and that is ready to be used.
        await this._ensureConnection();
        // Ensure that the database has the required tables.
        await this._ensureTables();
        // prepare the hashes that will represent the keys.
        return this.prepareMultipleKeyComponents(keys);
    }

    /**
     * Returns the amount of records that can be handled by a single SQL statement whenever splitting is required due to bandwidth or query size limitations.
     *
     * @returns {number} An integer number greater than zero representing the amount.
     *
     * @private
     */
    _getChunkSize(){
        const size = this.getOptions().chunkSize;
        return size == null || isNaN(size) || size <= 0 ? 100 : size;
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {DuplicateEntryException} If the given key were found and the "overwrite" option wasn't set to "true".
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async set(key, value, options){
        const components = await this._prepareTransaction(key);
        // Serialize the original value into JSON string representation.
        const serialization = serialize(value);
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        const ttl = this.getComputedTTL(options);
        const expire = SQLite3CacheDriver._computeExpireDate(ttl);
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        await (new Promise((resolve, reject) => {
            // Prepare the SQL statement.
            let query = options.overwrite ? 'INSERT OR REPLACE INTO ' : 'INSERT INTO ';
            query += 'cache_storage (namespace, key, value, data_type_code, date, expire) VALUES (?, ?, ?, ?, DATETIME("now"), ?);';
            // Execute the SQL statements with the corresponding arguments.
            this._connection.getConnection().run(query, [components.namespace, components.key, serialization.value, serialization.dataTypeCode, expire], (error) => {
                if ( error !== null ){
                    if ( error.errno === 19 && error.code === 'SQLITE_CONSTRAINT' ){
                        return reject(new DuplicateEntryException('Key already existing.', 4));
                    }
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 5, error));
                }
                resolve();
            });
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async get(key, options){
        const components = await this._prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        return await (new Promise((resolve, reject) => {
            // Prepare the SQL statement ensuring that expired items won't be considered.
            const query = 'SELECT value, data_type_code FROM cache_storage WHERE namespace = ? AND key = ? AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().get(query, [components.namespace, components.key], (error, item) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                if ( item === null || typeof item !== 'object' ){
                    if ( options.silent !== true ){
                        return reject(new InvalidArgumentException('Undefined key.', 2));
                    }
                    return resolve(null);
                }
                // Unserialize the fetched item.
                const value = unserialize(item.value, item.data_type_code);
                resolve(value);
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async exists(key, options) {
        const components = await this._prepareTransaction(key);
        return await (new Promise((resolve, reject) => {
            // Fetch the smallest data from the table in order to save bandwidth.
            const query = 'SELECT rowid FROM cache_storage WHERE namespace = ? AND key = ? AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().get(query, [components.namespace, components.key], (error, item) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                resolve(item !== null && typeof item === 'object');
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid key were given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async expire(key, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        const components = await this._prepareTransaction(key);
        const date = SQLite3CacheDriver._computeExpireDate(expire);
        return await (new Promise((resolve, reject) => {
            // If the item has already expired it can't be restored.
            const query = 'UPDATE cache_storage SET expire = ? WHERE namespace = ? AND key = ? AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().run(query, [date, components.namespace, components.key], (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                return resolve();
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async remove(key, options){
        const components = await this._prepareTransaction(key);
        await (new Promise((resolve, reject) => {
            const query = 'DELETE FROM cache_storage WHERE namespace = ? AND key = ?;';
            this._connection.getConnection().run(query, [components.namespace, components.key], (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                return resolve();
            });
        }));
    }

    /**
     * Drops all the entries stored within the cache.
     *
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {boolean} [options.dropFile=false] If set to "true" the database file will be removed, otherwise all its entries will be removed and the file kept.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     * @throws {RuntimeException} If an error occurs while deleting the database file.
     *
     * @async
     */
    async invalidate(options){
        // Checking that a connection has been defined and that is ready to be used.
        await this._ensureConnection();
        // Ensure that the required tables exists on the connected database.
        await this._ensureTables();
        if ( options === null || typeof options !== 'object' ){
            options = {dropFile: false};
        }
        const path = this._connection.getPath();
        if ( options.dropFile === true && path !== null ){
            // Close the connection with the database before removing it.
            await this._connection.disconnect();
            // As the database is going to be removed, if it will be used again, tables must be recreated.
            this._ensured = false;
            // If this connection is going to be used again, reconnection is needed before any operation.
            this._reconnect = true;
            // Remove the database file only if the "dropFile" option is set to "true" and if the database was not defined as "in-memory", otherwise just empty its contents.
            await (new Promise((resolve, reject) => {
                // Remove the database file.
                filesystem.unlink(path, (error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('An error occurred while deleting the database file.', 4, error));
                    }
                    resolve();
                });
            }));
            return;
        }
        await (new Promise((resolve, reject) => {
            const query = 'DELETE FROM cache_storage WHERE namespace = ?;';
            // Remove all the items matching current namespace from the database.
            this._connection.getConnection().run(query, [this._namespaceHash], (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
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
     * @param {boolean} [options.create=false] If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean} [options.silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {InvalidArgumentException} If the given key was not found.
     * @throws {InvalidArgumentException} If the given item is not a numeric value.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async increment(key, value = 1, options){
        // TODO: Enable support for BigInt, currently disabled as SQLite converts them into a 64-bit long integer leading to precision loss, re-enable them setting the IN clause from "IN(5)" to "IN(5, 8)".
        const components = await this._prepareTransaction(key);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( options === null || typeof options !== 'object' ){
            options = {create: false, silent: false};
        }
        let updateQuery = null, params = null;
        if ( options.create === true ){
            // If the "create" option is enabled, an insert should be tried first in order to create the element, if it exists, it will be cause a conflict and then the query will update it.
            updateQuery = 'INSERT OR IGNORE INTO cache_storage (namespace, key, value, data_type_code, date) VALUES (?, ?, ?, 5, DATETIME("now")) ON CONFLICT (namespace, key) DO ';
            updateQuery += 'UPDATE SET value = value + ? WHERE namespace = ? AND key = ? AND data_type_code IN (5, 8) AND (expire IS NULL OR expire >= DATETIME("now"));';
            params = [components.namespace, components.key, value, value, components.namespace, components.key];
        }else{
            updateQuery = 'UPDATE cache_storage SET value = value + ? WHERE namespace = ? AND key = ? AND data_type_code IN(5) AND ( expire IS NULL OR expire >= DATETIME("now") );';
            params = [value, components.namespace, components.key];
        }
        await (new Promise((resolve, reject) => {
            const _this = this;
            // Apply the increment only if the item is a numeric.
            this._connection.getConnection().run(updateQuery, params, function(error){
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                if ( options.silent !== true && this.changes !== 1 ){
                    // If the "silent" option is not enabled, a selection must be done in order to find out the exception to throw.
                    params = [value, components.namespace, components.key];
                    const query = 'SELECT data_type_code FROM cache_storage WHERE namespace = ? AND key = ? AND data_type_code IN(5) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                    _this._connection.getConnection().run(query, params, (error, element) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        if ( element === null || typeof element !== 'object' ){
                            return reject(new InvalidArgumentException('Undefined key.', 2));
                        }
                        if ( element.data_type_code !== 5 && element.data_type_code !== 8 ){
                            // The item is not a numeric value.
                            return reject(new InvalidArgumentException('The given item is not a numeric value.', 3));
                        }
                        reject(new RuntimeException('Unable to complete the operation on the database side.'));
                    });
                    return;
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
     * @param {boolean} [options.create=false] If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean} [options.silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {InvalidArgumentException} If the given key was not found.
     * @throws {InvalidArgumentException} If the given item is not a numeric value.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
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
     * @param {number|null?} [options.ttl=null] An integer number greater than zero representing the duration of each element in seconds.
     * @param {boolean} [options.overwrite=false] If set to "true" and if an item already exists, it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid object containing the items to store is given.
     * @throws {DuplicateEntryException} If one of the given keys were found and the "overwrite" option wasn't set to "true".
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async setMulti(items, options){
        const keys = Object.keys(items);
        const components = await this._prepareMultipleTransaction(keys);
        const connection = this._connection.getConnection();
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        const ttl = this.getComputedTTL(options);
        const expire = SQLite3CacheDriver._computeExpireDate(ttl);
        //TODO: Optimize this bulk insertion.
        await (new Promise((resolve, reject) => {
            // Start the SQL transaction.
            connection.run('BEGIN TRANSACTION;', [], (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 5, error));
                }
                // Prepare the SQL statement.
                let query = options.overwrite ? 'INSERT OR REPLACE INTO ' : 'INSERT INTO ';
                query += 'cache_storage (namespace, key, value, data_type_code, date, expire) VALUES (?, ?, ?, ?, DATETIME("now"), ?);';
                let processes = [];
                const length = keys.length;
                for ( let i = 0 ; i < length ; i++ ){
                    // Insert each element within the database.
                    processes.push(new Promise((resolve, reject) => {
                        let serialization = serialize(items[keys[i]]);
                        connection.run(query, [components.namespace, components.keys[i], serialization.value, serialization.dataTypeCode, expire], (error) => {
                            if ( error !== null ){
                                if ( error.errno === 19 && error.code === 'SQLITE_CONSTRAINT' ){
                                    return reject(new DuplicateEntryException('Key already existing.', 4));
                                }
                                return reject(new RuntimeException('Unable to complete the operation on the database side.', 5, error));
                            }
                            resolve();
                        });
                    }));
                }
                Promise.all(processes).then(() => {
                    // All the elements have been inserted successfully, commit the transaction and then return.
                    connection.run('COMMIT;', [], (error) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 5, error));
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during insert, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the insert operation.
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 5, error));
                        }
                        reject(ex);
                    });
                });
            });
        }));
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {boolean} [options.silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
     *
     * @returns {Promise<{string: *}>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If one of the given key was not found.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async getMulti(keys, options){
        const components = await this._prepareMultipleTransaction(keys);
        const connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        let references = {}, items = {};
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        const chunkSize = this._getChunkSize();
        // Compute the number of the item where the last chunk will start from.
        const rest = length < chunkSize ? length : ( length - ( length % chunkSize ) + 1 );
        for ( let i = 0 ; i < length ; i++ ){
            references[components.keys[i]] = keys[i];
            if ( ( i % chunkSize === 0 ) || i === rest ){
                // The end of a chunk has been reached, executing the SQL statement.
                let query = 'SELECT value, key, data_type_code FROM cache_storage WHERE namespace = ? AND key IN(';
                query += '?,'.repeat(length - i > chunkSize ? ( chunkSize - 1 ) : ( length - i - 1 ));
                query += '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                processes.push(new Promise((resolve, reject) => {
                    // Generating the chunk containing the keys to process by slicing the keys array.
                    connection.all(query, [components.namespace, ...components.keys.slice(i, i + chunkSize)], (error, items) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        resolve(items);
                    });
                }));
            }
        }
        processes = await Promise.all(processes);
        let count = 0;
        // Process each response.
        for ( let i = 0 ; i < processes.length ; i++ ){
            count += processes[i].length;
            for ( let j = 0 ; j < processes[i].length ; j++ ){
                // Get the value of each item found using its original key to populate the object that will be returned.
                const key = references.hasOwnProperty(processes[i][j].key) ? references[processes[i][j].key] : null;
                if ( key !== null ){
                    items[key] = unserialize(processes[i][j].value, processes[i][j].data_type_code);
                }
            }
        }
        if ( count !== length ){
            // If the number of the items returned by the database is different by the number of the original keys, something is missing.
            if ( options.silent !== true ){
                throw new InvalidArgumentException('Undefined key.', 2);
            }
            // Check which key wasn't found and then put it to null.
            for ( let i = 0 ; i < keys.length ; i++ ){
                if ( !items.hasOwnProperty(keys[i]) ){
                    items[keys[i]] = null;
                }
            }
        }
        return items;
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async existsMulti(keys, all = false, options){
        const components = await this._prepareMultipleTransaction(keys);
        const connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        let references = {}, items = {};
        const chunkSize = this._getChunkSize();
        // Compute the number of the item where the last chunk will start from.
        const rest = length < chunkSize ? length : ( length - ( length % chunkSize ) + 1 );
        for ( let i = 0 ; i < length ; i++ ){
            references[components.keys[i]] = keys[i];
            if ( ( i % chunkSize === 0 ) || i === rest ){
                // The end of a chunk has been reached, executing the SQL statement.
                let query = 'SELECT key FROM cache_storage WHERE namespace = ? AND key IN(';
                query += '?,'.repeat(length - i > chunkSize ? ( chunkSize - 1 ) : ( length - i - 1 ));
                query += '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                processes.push(new Promise((resolve, reject) => {
                    // Generating the chunk containing the keys to process by slicing the keys array.
                    connection.all(query, [components.namespace, ...components.keys.slice(i, i + chunkSize)], (error, items) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        resolve(items);
                    });
                }));
            }
        }
        processes = await Promise.all(processes);
        let count = 0;
        if ( all === true ){
            // If a single value must be returned, check if as many elements as the original array have been returned by the selection.
            for ( let i = 0 ; i < processes.length ; i++ ){
                count += processes[i].length;
            }
            return count === length;
        }
        // Process each response.
        for ( let i = 0 ; i < processes.length ; i++ ){
            count += processes[i].length;
            // Mark each returned element as found using its original key to populate the object that will be returned.
            for ( let j = 0 ; j < processes[i].length ; j++ ){
                const key = references.hasOwnProperty(processes[i][j].key) ? references[processes[i][j].key] : null;
                if ( key !== null ){
                    items[key] = true;
                }
            }
        }
        if ( count !== length ){
            // Mark missing elements as not found using the original keys array as an index.
            for ( let i = 0 ; i < keys.length ; i++ ){
                if ( !items.hasOwnProperty(keys[i]) ){
                    items[keys[i]] = false;
                }
            }
        }
        return items;
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async removeMulti(keys, options){
        const components = await this._prepareMultipleTransaction(keys);
        const connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        const chunkSize = this._getChunkSize();
        // Compute the number of the item where the last chunk will start from.
        const rest = length < chunkSize ? length : ( length - ( length % chunkSize ) + 1 );
        await (new Promise((resolve, reject) => {
            // Start the SQL transaction in order to ensure that all the elements gets removed or, in case of error, no item is removed.
            connection.run('BEGIN TRANSACTION;', (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                for ( let i = 0 ; i < length ; i++ ){
                    if ( ( i % chunkSize === 0 ) || i === rest ){
                        // The end of a chunk has been reached, executing the SQL statement.
                        let query = 'DELETE FROM cache_storage WHERE namespace = ? AND key IN(';
                        query += '?,'.repeat(length - i > chunkSize ? ( chunkSize - 1 ) : ( length - i - 1 )) + '?);';
                        processes.push(new Promise((resolve, reject) => {
                            // Generating the chunk containing the keys to process by slicing the keys array.
                            connection.run(query, [components.namespace, ...components.keys.slice(i, i + chunkSize)], (error) => {
                                if ( error !== null ){
                                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                                }
                                resolve();
                            });
                        }));
                    }
                }
                Promise.all(processes).then(() => {
                    // All the elements have been removed successfully, commit the transaction and then return.
                    connection.run('COMMIT;', [], (error) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during delete, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the delete operation.
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        reject(ex);
                    });
                });
            });
        }));
    }

    /**
     * Increments the value of multiple elements by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {(number|null)} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {boolean} [options.create=false] If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean} [options.silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async incrementMulti(keys, value = 1, options){
        // TODO: Enable support for BigInt, currently disabled as SQLite converts them into a 64-bit long integer leading to precision loss, re-enable them setting the IN clause from "IN(5)" to "IN(5, 8)".
        const components = await this._prepareMultipleTransaction(keys);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( options === null || typeof options !== 'object' ){
            options = {create: false, silent: false};
        }
        const connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        const chunkSize = this._getChunkSize();
        // Compute the number of the item where the last chunk will start from.
        const rest = length < chunkSize ? length : ( length - ( length % chunkSize ) + 1 );
        await (new Promise((resolve, reject) => {
            // Start the SQL transaction.
            connection.run('BEGIN TRANSACTION;', (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                // TODO: I don't know how, but I swear, I will manage to optimize this operation writing it in SQL only.
                for ( let i = 0 ; i < length ; i++ ){
                    if ( ( i % chunkSize === 0 ) || i === rest ) {
                        // Get the amount of items that will be processed by these statements.
                        const amount = length - i > chunkSize ? ( chunkSize ) : ( length - i );
                        const placeholders = '?,'.repeat(amount - 1) + '?';
                        const query = 'UPDATE cache_storage SET value = value + ? WHERE data_type_code IN(5) AND namespace = ? AND key IN(' + placeholders + ') AND ( expire IS NULL OR expire >= DATETIME("now") );';
                        processes.push(new Promise((resolve, reject) => {
                            // Generating the chunk containing the keys to process by slicing the keys array.
                            const params = [value, components.namespace, ...components.keys.slice(i, i + chunkSize)];
                            connection.run(query, params, function(error) {
                                if ( error !== null ){
                                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                                }
                                if ( this.changes !== amount && ( options.create === true || options.silent !== true ) ){
                                    // In order to check the reason why some of the items have not been updated, a selection is required in order to find out the non-compliant items.
                                    const query = 'SELECT ' + ( options.silent === true ? 'key' : 'key, data_type_code' ) + ' FROM cache_storage WHERE namespace = ? AND key IN(' + placeholders + ') AND ( expire IS NULL OR expire >= DATETIME("now") );';
                                    const selectionParams = params.slice(1);
                                    connection.all(query, selectionParams, (error, elements) => {
                                        if ( error !== null ){
                                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                                        }
                                        // TODO: Optimize this array filter.
                                        let missing = params.slice(2);
                                        const length = elements.length;
                                        let valid = true;
                                        // Having a copy of the items that should have been processed, remove from this list the compliant items in order to find out the items to check here.
                                        for ( let i = 0 ; i < length ; i++ ){
                                            if ( options.silent !== true && elements[i].data_type_code !== 5 && elements[i].data_type_code !== 8 ){
                                                valid = false;
                                                break;
                                            }
                                            const index = missing.indexOf(elements[i].key);
                                            delete missing[index];
                                        }
                                        if ( !valid ){
                                            // If at least one non numeric value has been found within the list, throw an exception.
                                            return reject(new InvalidArgumentException('The given item is not a numeric value.', 5));
                                        }
                                        // Remove empty elements from the processed array.
                                        missing = missing.filter(element => typeof element !== 'undefined');
                                        if ( missing.length !== 0 ){
                                            if ( options.silent !== true && options.create !== true ){
                                                return reject(new InvalidArgumentException('Undefined key.', 6));
                                            }
                                            // If the "create" option has been enabled, create each missing element.
                                            const query = 'INSERT INTO cache_storage (namespace, key, value, data_type_code, date) VALUES (?, ?, ?, 5, DATETIME("now"));';
                                            const length = missing.length;
                                            let operations = [];
                                            // TODO: Optimize this bulk insertion.
                                            for ( let i = 0 ; i < length ; i++ ){
                                                operations.push(new Promise(() => {
                                                    connection.run(query, [params[1], missing[i], params[0]], (error) => {
                                                        if ( error !== null ){
                                                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                                                        }
                                                        resolve();
                                                    });
                                                }));
                                            }
                                            Promise.all(operations).then(() => {
                                                resolve();
                                            }).catch((ex) => {
                                                reject(ex);
                                            });
                                            return;
                                        }
                                        reject(new RuntimeException('Unable to complete the operation on the database side.'));
                                    });
                                    return;
                                }
                                resolve();
                            });
                        }));
                    }
                }
                Promise.all(processes).then(() => {
                    // All the elements have been updated successfully, commit the transaction and then return.
                    connection.run('COMMIT;', [], (error) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during update, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the update operation.
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        reject(ex);
                    });
                });
            });
        }));
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {(number|null)} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {{string: *}} [options] An object representing the additional options to consider.
     *
     * @param {boolean} [options.create=false] If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean} [options.silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async decrementMulti(keys, value = 1, options){
        const increment = value === null || isNaN(value) ? -1 : -value;
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
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async expireMulti(keys, expire, options){
        const components = await this._prepareMultipleTransaction(keys);
        const connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        const date = SQLite3CacheDriver._computeExpireDate(expire);
        const chunkSize = this._getChunkSize();
        // Compute the number of the item where the last chunk will start from.
        const rest = length < chunkSize ? length : ( length - ( length % chunkSize ) + 1 );
        await (new Promise((resolve, reject) => {
            connection.run('BEGIN TRANSACTION;', (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                for ( let i = 0 ; i < length ; i++ ){
                    if ( ( i % chunkSize === 0 ) || i === rest ){
                        // The end of a chunk has been reached, executing the SQL statement.
                        let query = 'UPDATE cache_storage SET expire = ? WHERE namespace = ? AND key IN(';
                        query += '?,'.repeat(length - i > chunkSize ? ( chunkSize - 1 ) : ( length - i - 1 )) + '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                        processes.push(new Promise((resolve, reject) => {
                            // Generating the chunk containing the keys to process by slicing the keys array.
                            connection.all(query, [date, components.namespace, ...components.keys.slice(i, i + chunkSize)], (error) => {
                                if ( error !== null ){
                                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                                }
                                resolve();
                            });
                        }));
                    }
                }
                Promise.all(processes).then(() => {
                    // All the elements have been updated successfully, commit the transaction and then return.
                    connection.run('COMMIT;', [], (error) => {
                        if ( error !== null ){
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during update, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the update operation.
                            return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                        }
                        reject(ex);
                    });
                });
            });
        }));
    }

    /**
     * Removes all the expired entries.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to a SQLite3 database has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the database.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async runGarbageCollector(){
        // Checking that a connection has been defined and that is ready to be used.
        await this._ensureConnection();
        // Ensure that the required tables exists on the connected database.
        await this._ensureTables();
        await (new Promise((resolve, reject) => {
            const query = 'DELETE FROM cache_storage WHERE namespace = ? AND expire IS NOT NULL AND expire < DATETIME("now");';
            // Remove all the items matching current namespace from the database.
            this._connection.getConnection().run(query, [this._namespaceHash], (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to complete the operation on the database side.', 3, error));
                }
                resolve();
            });
        }));
    }

    /**
     * Prepare the class instance by creating the required tables on the database.
     *
     * @returns {Promise<void>}
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} If the driver that has been defined is not connected to the cache storage engine.
     * @throws {RuntimeException} If an error occurs during the operation on the database side.
     *
     * @async
     */
    async init() {
        // Ensure that the required tables exists on the connected database.
        await this._ensureTables();
    }
}

module.exports = SQLite3CacheDriver;