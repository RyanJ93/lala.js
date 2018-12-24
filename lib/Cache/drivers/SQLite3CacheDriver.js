'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const Config = require('../../Config/Config');
const Logger = require('../../Logger/Logger');
const Cache = require('../Cache');
const CacheDriver = require('../CacheDriver');
const SQLite3Connection = require('../../Database/connections/SQLite3Connection');
const {
    InvalidArgumentException,
    MisconfigurationException,
    DriverNotDefinedException,
    DriverNotConnectedException,
    DuplicateEntryException,
    SerializationException,
    ParseException
} = require('../../Exceptions');

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

class SQLite3CacheDriver extends CacheDriver {
    /**
     * Sets up the driver by loading and instantiating connections from configuration file.
     *
     * @returns {Promise<boolean>}
     *
     * @async
     */
    static async setup(){
        if ( _sqlite3 === null ){
            return false;
        }
        let cache = Config.getProperty('cache');
        if ( cache === null || cache._connections === null || typeof cache._connections !== 'object' ){
            return true;
        }
        for ( let i = 0 ; i < cache._connections.length ; i++ ){
            let driver = cache._connections[i];
            // Ignoring configuration block that are not referred to SQLite3 driver.
            if ( driver === null || typeof driver !== 'object' || driver.type !== 'sqlite3' ){
                continue;
            }
            if ( driver.name === '' || typeof driver.name !== 'string' ){
                continue;
            }
            try{
                // Generating the connection class instance from the configuration block.
                let connection = SQLite3Connection.createFromConfigBlock(driver);
                // Establish the connection.
                await connection.connect();
                // Register the connection globally.
                SQLite3CacheDriver.addConnection(driver.name, connection);
            }catch(ex){}
        }
        return true;
    }

    /**
     * Registers a new connection to a SQLite database that will be available globally.
     *
     * @param {string} name A string containing the name that identifies the connection.
     * @param {SQLite3Connection} connection An instance of the class "SQLite3Connection" representing the connection with the SQLite database.
     *
     * @throws InvalidArgumentException If an invalid name were given.
     * @throws InvalidArgumentException If an invalid connection object were given.
     */
    static addConnection(name, connection){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( !connection instanceof SQLite3Connection ){
            throw new InvalidArgumentException('Invalid connection object.', 2);
        }
        Cache.addConnection('sqlite3', name, connection);
    }

    /**
     * Serializes the given value into a JSON string representation.
     *
     * @param {any} value An arbitrary value that should be serialized into a string.
     *
     * @returns {{dataType: string, dataTypeCode: number, value: string}} An object containing the serialization components, such as the serialized value and the value's data type.
     *
     * @throws SerializationException If a function is given as value to be serialized.
     * @throws SerializationException If an unsupported value to serialize is given.
     *
     * @private
     */
    static _serialize(value){
        // Use this object definition as reference for the numeric code used in "datatype" field in database table.
        const dataTypes = {
            ['undefined']: 1,
            ['null']: 2,
            ['object']: 3,
            ['boolean']: 4,
            ['number']: 5,
            ['string']: 6,
            ['array']: 7,
            ['bigint']: 8
        };
        // A stupid workaround to turn off a WebStorm's warning.
        let dataType = String(typeof value);
        if ( dataType === 'function' ){
            //TODO: Consider function serialization support using the "toSource" method.
            throw new SerializationException('Functions cannot be serialized and stored as a string representation.', 1);
        }
        if ( !dataTypes.hasOwnProperty(dataType) ){
            throw new SerializationException('Unsupported datatype.', 2);
        }
        let dataTypeCode = dataTypes[dataType];
        // Apply corrections for the data type found.
        if ( value === null ){
            dataTypeCode = 2;
            dataType = 'null';
        }
        if ( Array.isArray(value) ){
            dataTypeCode = 7;
            dataType = 'array';
        }
        let serialization = '';
        // Serialize the original data.
        switch ( dataTypeCode ){
            case 3:
            case 7:{
                serialization = JSON.stringify(value);
            }break;
            case 4:{
                serialization = value ? 'true' : 'false';
            }break;
            case 5:
            case 8:{
                serialization = value.toString();
            }break;
            case 6:{
                serialization = value;
            }break;
        }
        return {
            value: serialization,
            dataType: dataType,
            dataTypeCode: dataTypeCode
        };
    }

    /**
     * Converts a JSON string representation of a value into the original one.
     *
     * @param {string} value A string representing the serialized value to covert.
     * @param {number} dataType An integer number greater than zero representing the original data type.
     *
     * @returns {any} The original value.
     *
     * @throws ParseException If an error occurs during the unserialization process.
     *
     * @private
     */
    static _unserialize(value, dataType){
        try{
            let unserialization = dataType === 1 ? undefined : null;
            switch ( dataType ){
                case 3:
                case 7:{
                    unserialization = JSON.parse(value);
                }break;
                case 4:{
                    unserialization = value === 'true';
                }break;
                case 5:{
                    unserialization = parseFloat(value);
                }break;
                case 6:{
                    unserialization = value;
                }break;
                case 8:{
                    unserialization = BigInt(value);
                }break;
            }
            return unserialization;
        }catch(ex){
            throw new ParseException('Your data seems to be malformed.', 1, ex);
        }
    }

    /**
     * Generates a string representation of the expected expire date.
     *
     * @param {number|null} ttl An integer number representing the amount of seconds after that the item should expire, if set to null or a value lower or equal than zero, the item will never expire.
     *
     * @returns {string|null} A string representation of the expire date in SQL format, if no expire date has been given, null will be returned instead.
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
     */
    constructor(){
        super();
        this._ensured = false;
        this.setConnection(null);
    }

    /**
     * Sets the connection to use, this method is chainable.
     *
     * @param {string|SQLite3Connection|null} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @return {SQLite3CacheDriver}
     *
     * @throws MisconfigurationException If no default connection is found.
     * @throws InvalidArgumentException If no connection matching the given name is found.
     * @throws InvalidArgumentException If an invalid connection object is given.
     */
    setConnection(connection){
        if ( connection === null ){
            // No connection has been defined, getting the default one.
            connection = Cache.getConnection('sqlite3', null);
            if ( connection === null ){
                throw new MisconfigurationException('No default connection found.', 1);
            }
            this._connection = connection;
            this._ensured = false;
            return this;
        }
        if ( connection !== '' && typeof connection === 'string' ){
            // Getting the connection matching the given name (it must have been registered.).
            connection = Cache.getConnection('sqlite3', connection);
            if ( connection === null ){
                throw new InvalidArgumentException('Connection not found.', 2);
            }
            this._connection = connection;
            this._ensured = false;
            return this;
        }
        if ( !connection instanceof SQLite3Connection ){
            throw new InvalidArgumentException('Invalid connection object.', 3);
        }
        // Setting the given connection object.
        this._connection = connection;
        this._ensured = false;
        return this;
    }

    /**
     * Returns the connection that will be used.
     *
     * @return {SQLite3Connection|null} An instance of the class "SQLite3Connection" representing the database connection, if no connection has been defined, null will be returned instead.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Ensures that the required tables exists within the database that has been defined, otherwise it will create them.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to the cache storage engine has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the cache storage engine.
     *
     * @async
     * @private
     */
    _ensureTables(){
        if ( this._ensured === false ){
            // Checking that a connection has been defined and that is ready to be used.
            this.ensureConnection();
            return new Promise((resolve, reject) => {
                // Create the table that will contain the cached items.
                this._connection.getConnection().exec('CREATE TABLE IF NOT EXISTS cache_storage (namespace TEXT, key TEXT, value TEXT, data_type_code INTEGER, date DATETIME, expire DATETIME, PRIMARY KEY (namespace, key));', (error) => {
                    if ( error !== null ){
                        return reject(error);
                    }
                    this._ensured = true;
                    resolve();
                });
            });
        }
    }

    /**
     * Prepares a database transaction using a given key.
     *
     * @param {string} key A string representing the item key.
     *
     * @returns {string} {{namespace: null|string, key: string, signature: string}} An object containing the generated key components such as the key and the namespace hash.
     *
     * @throws DriverNotDefinedException If no connection to the cache storage engine has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the cache storage engine.
     * @throws InvalidArgumentException If the given key is not valid.
     */
    async _prepareTransaction(key){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
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
     * @throws DriverNotDefinedException If no connection to the cache storage engine has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the cache storage engine.
     * @throws InvalidArgumentException If an invalid keys array is given.
     * @throws InvalidArgumentException If an invalid key is found within the given array, or if the whole array is invalid.
     */
    async _prepareMultipleTransaction(keys){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // prepare the hashes that will represent the keys.
        return this.prepareMultipleKeyComponents(keys);
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws DuplicateEntryException If the given key were found and the "overwrite" option wasn't set to "true".
     *
     * @async
     */
    async set(key, value, options){
        let components = await this._prepareTransaction(key);
        // Serialize the original value into JSON string representation.
        let serialization = SQLite3CacheDriver._serialize(value);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        let ttl = this.getComputedTTL(options);
        let expire = SQLite3CacheDriver._computeExpireDate(ttl);
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
                    return reject(error);
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async get(key, options){
        let components = await this._prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        return await (new Promise((resolve, reject) => {
            // Prepare the SQL statement ensuring that expired items won't be considered.
            let query = 'SELECT value, data_type_code FROM cache_storage WHERE namespace = ? AND key = ? AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().get(query, [components.namespace, components.key], (error, item) => {
                if ( error !== null ){
                    return reject(error);
                }
                if ( item === null || typeof item !== 'object' ){
                    if ( options.silent !== true ){
                        return reject(new InvalidArgumentException('Undefined key.', 2));
                    }
                    return resolve(null);
                }
                // Unserialize the fetched item.
                let value = SQLite3CacheDriver._unserialize(item.value, item.data_type_code);
                resolve(value);
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async exists(key, options) {
        let components = await this._prepareTransaction(key);
        return await (new Promise((resolve, reject) => {
            // Fetch the smallest data from the table in order to save bandwidth.
            let query = 'SELECT data_type_code FROM cache_storage WHERE namespace = ? AND key = ? AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().get(query, [components.namespace, components.key], (error, item) => {
                if ( error !== null ){
                    return reject(error);
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
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid key were given.
     * @throws InvalidArgumentException If an invalid expiration time is given.
     *
     * @async
     */
    async expire(key, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 4);
        }
        let components = await this._prepareTransaction(key);
        let date = SQLite3CacheDriver._computeExpireDate(expire);
        return await (new Promise((resolve, reject) => {
            // If the item has already expired it can't be restored.
            let query = 'UPDATE cache_storage SET expire = ? WHERE namespace = ? AND key = ? AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().run(query, [date, components.namespace, components.key], (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                return resolve();
            });
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async remove(key, options){
        let components = await this._prepareTransaction(key);
        await (new Promise((resolve, reject) => {
            let query = 'DELETE FROM cache_storage WHERE namespace = ? AND key = ?;';
            this._connection.getConnection().run(query, [components.namespace, components.key], (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                return resolve();
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     *
     * @async
     */
    async invalidate(options){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // Ensure that the required tables exists on the connected database.
        await this._ensureTables();
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        await (new Promise((resolve, reject) => {
            let query = 'DELETE FROM cache_storage WHERE namespace = ?;';
            // Remove all the items matching current namespace from the database.
            this._connection.getConnection().run(query, [this._namespaceHash], (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                if ( options.dropFile !== true ){
                    return resolve();
                }
                let path = this._connection.getPath();
                if ( path === null ){
                    // As the database in use has been defined as "in-memory", no file is required to be removed.
                    return resolve();
                }
                // Remove the database file.
                filesystem.unlink(path, (error) => {
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async increment(key, value = null, options){
        let components = await this._prepareTransaction(key);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        await (new Promise((resolve, reject) => {
            // Apply the increment only if the item is a numeric.
            let query = 'UPDATE cache_storage SET value = value + ? WHERE namespace = ? AND key = ? AND data_type_code IN(5, 8) AND ( expire IS NULL OR expire >= DATETIME("now") );';
            this._connection.getConnection().run(query, [value, components.namespace, components.key], (error) => {
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid object containing the items to store is given.
     * @throws DuplicateEntryException If one of the given keys were found and the "overwrite" option wasn't set to "true".
     *
     * @async
     */
    async setMulti(items, options){
        let keys = Object.keys(items);
        let components = await this._prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        // Get item's TTL in seconds (if a TTL has been defined).
        let ttl = this.getComputedTTL(options);
        let expire = SQLite3CacheDriver._computeExpireDate(ttl);
        //TODO: Optimize this bulk insertion.
        await (new Promise((resolve, reject) => {
            // Start the SQL transaction.
            connection.run('BEGIN TRANSACTION;', [], (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                // Prepare the SQL statement.
                let query = options.overwrite ? 'INSERT OR REPLACE INTO ' : 'INSERT INTO ';
                query += 'cache_storage (namespace, key, value, data_type_code, date, expire) VALUES (?, ?, ?, ?, DATETIME("now"), ?);';
                let processes = [];
                for ( let i = 0 ; i < keys.length ; i++ ){
                    // Insert each element within the database.
                    processes.push(new Promise((resolve, reject) => {
                        let serialization = SQLite3CacheDriver._serialize(items[keys[i]]);
                        connection.run(query, [components.namespace, components.keys[i], serialization.value, serialization.dataTypeCode, expire], (error) => {
                            if ( error !== null ){
                                if ( error.errno === 19 && error.code === 'SQLITE_CONSTRAINT' ){
                                    return reject(new DuplicateEntryException('Key already existing.', 4));
                                }
                                return reject(error);
                            }
                            resolve();
                        });
                    }));
                }
                Promise.all(processes).then(() => {
                    // All the elements have been inserted successfully, commit the transaction and then return.
                    connection.run('COMMIT;', [], (error) => {
                        if ( error !== null ){
                            return reject(error);
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during insert, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the insert operation.
                            return reject(error);
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
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async getMulti(keys, options){
        let components = await this._prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        let references = {}, items = {};
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        // Compute the number of the item where the last chunk will start from.
        const rest = length < 100 ? length : ( length - ( length % 100 ) + 1 );
        for ( let i = 0 ; i < length ; i++ ){
            references[components.keys[i]] = keys[i];
            if ( ( i % 100 === 0 ) || i === rest ){
                // The end of a chunk has been reached, executing the SQL statement.
                let query = 'SELECT value, key, data_type_code FROM cache_storage WHERE namespace = ? AND key IN(';
                query += '?,'.repeat(length - i > 100 ? 99 : ( length - i - 1 ));
                query += '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                processes.push(new Promise((resolve, reject) => {
                    // Generating the chunk containing the keys to process by slicing the keys array.
                    connection.all(query, [components.namespace, ...components.keys.slice(i, i + 100)], (error, items) => {
                        if ( error !== null ){
                            return reject(error);
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
                let key = references.hasOwnProperty(processes[i][j].key) ? references[processes[i][j].key] : null;
                if ( key !== null ){
                    items[key] = SQLite3CacheDriver._unserialize(processes[i][j].value, processes[i][j].data_type_code);
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
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {boolean} all If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean|object>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async existsMulti(keys, all = false, options){
        let components = await this._prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        let references = {}, items = {};
        // Compute the number of the item where the last chunk will start from.
        const rest = length < 100 ? length : ( length - ( length % 100 ) + 1 );
        for ( let i = 0 ; i < length ; i++ ){
            references[components.keys[i]] = keys[i];
            if ( ( i % 100 === 0 ) || i === rest ){
                // The end of a chunk has been reached, executing the SQL statement.
                let query = 'SELECT key FROM cache_storage WHERE namespace = ? AND key IN(';
                query += '?,'.repeat(length - i > 100 ? 99 : ( length - i - 1 ));
                query += '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                processes.push(new Promise((resolve, reject) => {
                    // Generating the chunk containing the keys to process by slicing the keys array.
                    connection.all(query, [components.namespace, ...components.keys.slice(i, i + 100)], (error, items) => {
                        if ( error !== null ){
                            return reject(error);
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
                let key = references.hasOwnProperty(processes[i][j].key) ? references[processes[i][j].key] : null;
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
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async removeMulti(keys, options){
        let components = await this._prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        // Compute the number of the item where the last chunk will start from.
        const rest = length < 100 ? length : ( length - ( length % 100 ) + 1 );
        await (new Promise((resolve, reject) => {
            // Start the SQL transaction in order to ensure that all the elements gets removed or, in case of error, no item is removed.
            connection.run('BEGIN TRANSACTION;', (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                for ( let i = 0 ; i < length ; i++ ){
                    if ( ( i % 100 === 0 ) || i === rest ){
                        // The end of a chunk has been reached, executing the SQL statement.
                        let query = 'DELETE FROM cache_storage WHERE namespace = ? AND key IN(';
                        query += '?,'.repeat(length - i > 100 ? 99 : ( length - i - 1 )) + '?);';
                        processes.push(new Promise((resolve, reject) => {
                            // Generating the chunk containing the keys to process by slicing the keys array.
                            connection.run(query, [components.namespace, ...components.keys.slice(i, i + 100)], (error) => {
                                if ( error !== null ){
                                    return reject(error);
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
                            return reject(error);
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during delete, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the delete operation.
                            return reject(error);
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
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async incrementMulti(keys, value, options){
        let components = await this._prepareMultipleTransaction(keys);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        let connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        // Compute the number of the item where the last chunk will start from.
        const rest = length < 100 ? length : ( length - ( length % 100 ) + 1 );
        await (new Promise((resolve, reject) => {
            // Start the SQL transaction.
            connection.run('BEGIN TRANSACTION;', (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                for ( let i = 0 ; i < length ; i++ ){
                    if ( ( i % 100 === 0 ) || i === rest ){
                        // The end of a chunk has been reached, executing the SQL statement.
                        let query = 'UPDATE cache_storage SET value = value + ? WHERE data_type_code IN(5, 8) AND namespace = ? AND key IN(';
                        query += '?,'.repeat(length - i > 100 ? 99 : ( length - i - 1 )) + '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                        processes.push(new Promise((resolve, reject) => {
                            // Generating the chunk containing the keys to process by slicing the keys array.
                            connection.run(query, [value, components.namespace, ...components.keys.slice(i, i + 100)], (error) => {
                                if ( error !== null ){
                                    return reject(error);
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
                            return reject(error);
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during update, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the update operation.
                            return reject(error);
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
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     * @throws InvalidArgumentException If an invalid expiration time is given.
     *
     * @async
     */
    async expireMulti(keys, expire, options){
        let components = await this._prepareMultipleTransaction(keys);
        let connection = this._connection.getConnection();
        let processes = [];
        const length = components.keys.length;
        let date = SQLite3CacheDriver._computeExpireDate(expire);
        // Compute the number of the item where the last chunk will start from.
        const rest = length < 100 ? length : ( length - ( length % 100 ) + 1 );
        await (new Promise((resolve, reject) => {
            connection.run('BEGIN TRANSACTION;', (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                for ( let i = 0 ; i < length ; i++ ){
                    if ( ( i % 100 === 0 ) || i === rest ){
                        // The end of a chunk has been reached, executing the SQL statement.
                        let query = 'UPDATE cache_storage SET expire = ? WHERE namespace = ? AND key IN(';
                        query += '?,'.repeat(length - i > 100 ? 99 : ( length - i - 1 )) + '?) AND ( expire IS NULL OR expire >= DATETIME("now") );';
                        processes.push(new Promise((resolve, reject) => {
                            // Generating the chunk containing the keys to process by slicing the keys array.
                            connection.all(query, [date, components.namespace, ...components.keys.slice(i, i + 100)], (error) => {
                                if ( error !== null ){
                                    return reject(error);
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
                            return reject(error);
                        }
                        resolve();
                    });
                }).catch((ex) => {
                    // An error occurred during update, rollback the whole transaction.
                    connection.run('ROLLBACK;', [], (error) => {
                        if ( error !== null ){
                            // If an error occurs during transaction rollback throw it stead of throwing the error from the update operation.
                            return reject(error);
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
     * @throws DriverNotDefinedException If no connection to a SQLite3 database has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the database.
     *
     * @async
     */
    async runGarbageCollector(){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // Ensure that the required tables exists on the connected database.
        await this._ensureTables();
        await (new Promise((resolve, reject) => {
            let query = 'DELETE FROM cache_storage WHERE namespace = ? AND expire IS NOT NULL AND expire < DATETIME("now");';
            // Remove all the items matching current namespace from the database.
            this._connection.getConnection().run(query, [this._namespaceHash], (error) => {
                if ( error !== null ){
                    return reject(error);
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
     * @throws DriverNotDefinedException If no connection to the cache storage engine has been defined.
     * @throws DriverNotConnectedException If the driver that has been defined is not connected to the cache storage engine.
     */
    async init() {
        // Ensure that the required tables exists on the connected database.
        await this._ensureTables();
    }
}

module.exports = SQLite3CacheDriver;