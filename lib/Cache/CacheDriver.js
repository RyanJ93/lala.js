'use strict';

// Including native modules.
const crypto = require('crypto');

// Including Lala's modules.
const {
    NotCallableException,
    InvalidArgumentException,
    RuntimeException,
    DriverNotDefinedException,
    DriverNotConnectedException
} = require('../Exceptions');

/**
 * @typedef {Object} CachingKeyComponents An object containing all the components generated after caching key processing.
 *
 * @property {string} key A string containing the caching key after being hashed.
 * @property {string} namespace A string containing the namespace hash or "*" if global namespace is being used.
 * @property {string} signature A string containing the framework signature used to identify entries saved in cache.
 */

/**
 * @typedef {Object} MultiCachingKeyComponents An object containing all the components generated after multiple caching keys are processed.
 *
 * @property {string[]} keys An array containing the the given keys after being hashed.
 * @property {string} namespace A string containing the namespace hash or "*" if global namespace is being used.
 * @property {string} signature A string containing the framework signature used to identify entries saved in cache.
 */

/**
 * @typedef {Object} CacheOptions An object representing some options that must be considered during operations on cache.
 *
 * @property {string} namespace A string containing a new namespace that should be appended, or replaced, to defined one.
 * @property {boolean} overrideNamespace If set to "true", and if another namespace is given as an option, it will be used instead of the defined one.
 */

/**
 * @typedef {CacheOptions} CacheSetOptions An object representing some additional options considered during "set" operations.
 */

/**
 * @typedef {CacheOptions} CacheGetOptions An object representing some additional options considered during "get" operations.
 */

/**
 * @typedef {CacheOptions} CacheExistsOptions An object representing some additional options considered during "exists" operations.
 */

/**
 * @typedef {CacheOptions} CacheExpireOptions An object representing some additional options considered during "expire" operations.
 */

/**
 * @typedef {CacheOptions} CacheRemoveOptions An object representing some additional options considered during "remove" operations.
 */

/**
 * @typedef {CacheOptions} CacheInvalidateOptions An object representing some additional options considered during "invalidate" operations.
 */

/**
 * @typedef {CacheOptions} CacheIncrementOptions An object representing some additional options considered during "increment" operations.
 */

/**
 * @typedef {CacheOptions} CacheDecrementOptions An object representing some additional options considered during "decrement" operations.
 */

/**
 * @typedef {CacheOptions} CacheSetMultiOptions An object representing some additional options considered during multiple "set" operations.
 */

/**
 * @typedef {CacheOptions} CacheGetMultiOptions An object representing some additional options considered during multiple "get" operations.
 */

/**
 * @typedef {CacheOptions} CacheExistsMultiOptions An object representing some additional options considered during multiple "exists" operations.
 */

/**
 * @typedef {CacheOptions} CacheRemoveMultiOptions An object representing some additional options considered during multiple "remove" operations.
 */

/**
 * @typedef {CacheOptions} CacheIncrementMultiOptions An object representing some additional options considered during multiple "increment" operations.
 */

/**
 * @typedef {CacheOptions} CacheDecrementMultiOptions An object representing some additional options considered during multiple "increment" operations.
 */

/**
 * @typedef {CacheOptions} CacheExpireMultiOptions An object representing some additional options considered during multiple "expire" operations.
 */

/**
 * The base class that provides the skeleton for any cache driver implementation.
 *
 * @abstract
 */
class CacheDriver {
    /**
     * Returns the framework signature used to identify entries saved in cache.
     *
     * @returns {string} A string containing the framework signature.
     */
    static getGlobalPrefix(){
        return 'lala';
    }

    /**
     * Allows the driver to run the setup operations such as ensuring the connection and the required module presence.
     *
     * @returns {Promise<boolean>}
     *
     * @abstract
     * @async
     */
    static async setup(){}

    /**
     * Generates and saves the namespace hash using the defined hashing algorithm.
     *
     * @protected
     */
    _digestNamespace(){
        if ( this._namespace === null ){
            this._namespaceHash = null;
        }
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        // Generate a hash from the namespace in order to ensure length and a standard format.
        this._namespaceHash = crypto.createHash(algorithm).update(this._namespace).digest('hex');
    }

    /**
     * Generates a hash from a given namespace or loads the hash is the given namespace was the last processed one.
     *
     * @param {string} namespace A string containing the namespace to prepare.
     *
     * @returns {string} A string containing the namespace after being hashed.
     *
     * @protected
     */
    _prepareNamespaceOverride(namespace){
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        let namespaceHash;
        if ( this._lastNamespaceOverride !== null && this._lastNamespaceOverride.namespace === namespace ){
            // The given namespace was the last one processed, use the cache hash.
            namespaceHash = this._lastNamespaceOverride.hash;
        }else{
            // Generate a hash from the namespace in order to ensure length and a standard format.
            namespaceHash = crypto.createHash(algorithm).update(namespace).digest('hex');
            this._lastNamespaceOverride = {
                namespace: namespace,
                hash: namespaceHash
            };
        }
        return namespaceHash;
    }

    /**
     * Returns the namespace to use according to given options.
     *
     * @param {?CacheOptions} options An object containing the options that have been passed to the method that implements the cache operation being executed.
     *
     * @returns {string} A string containing the namespace after being hashed.
     *
     * @protected
     */
    _getComputedNamespace(options){
        let namespace = this._namespaceHash === null ? '*' : this._namespaceHash;
        if ( options !== null && options.namespace !== '' && typeof options.namespace === 'string' ){
            namespace = options.overrideNamespace === true ? options.namespace : ( this._namespace + ':' + options.namespace );
            // Generate a hash from current namespace.
            namespace = this._prepareNamespaceOverride(namespace);
        }
        return namespace;
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'CacheDriver' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {string|null} _namespace A string containing the namespace used to group the stored items.
         *
         * @protected
         */
        this._namespace = null;

        /**
         * @type {string|null} _namespaceHash A string representing the hash of the namespace defined according to the hashing algorithm defined.
         *
         * @protected
         */
        this._namespaceHash = null;

        /**
         * @type {boolean} _ready If set to "true" it means that the driver is ready to accept transactions.
         *
         * @protected
         */
        this._ready = true;

        /**
         * @type {number|null} _ttl An integer number greater than zero representing the expiration time of the items, by default, no expiration time is applied.
         *
         * @protected
         */
        this._ttl = null;

        /**
         * @type {boolean} _overwrite If set to "true" and if an item that is going to be stored already exists, it will be overwritten by newer one, otherwise an exception will be thrown.
         *
         * @protected
         */
        this._overwrite = false;

        /**
         * @type {object|null} _connection An instance of the class that implements the external storage engine connection, if external interfacing is required by the cache driver.
         *
         * @protected
         */
        this._connection = null;

        /**
         * @type {{string: *}} _options An object containing the additional custom options that the cache driver must take care of.
         *
         * @protected
         */
        this._options = {};

        /**
         * @type {string} _hashingAlgorithm A string containing the name of the hashing algorithm to use to generate the items keys, by default, the MD5 algorithm will be used.
         *
         * @protected
         */
        this._hashingAlgorithm = 'md5';

        /**
         * @type {?string} [_path] A string containing the path where the cached data will be stored in, if the cache driver supports file based storage.
         *
         * @protected
         */
        this._path = null;

        /**
         * @type {?{namespace: string, hash: string}} [_lastNamespaceOverride] An object containing the last namespace
         * 
         * @protected
         */
        this._lastNamespaceOverride = null;
    }

    /**
     * Sets the custom options to consider, this method is chainable.
     *
     * @param {{string: *}} options An object containing the custom options.
     *
     * @returns {CacheDriver}
     */
    setOptions(options){
        this._options = options === null || typeof options !== 'object' ? {} : options;
        return this;
    }

    /**
     * Returns the custom options to consider.
     *
     * @returns {{string: *}} An object containing the custom options.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Sets the algorithm to use in keys hashing, this method is chainable.
     *
     * @param {string} algorithm A string containing the name of the hashing algorithm, if set to null, "md5" will be used instead.
     *
     * @returns {CacheDriver}
     *
     * @throws {InvalidArgumentException} If an invalid algorithm name has been given.
     * @throws {InvalidArgumentException} If an unsupported algorithm has been given.
     */
    setHashingAlgorithm(algorithm){
        if ( algorithm === null || algorithm === 'md5' ){
            this._hashingAlgorithm = 'md5';
            return this;
        }
        if ( algorithm === '' || typeof algorithm !== 'string' ){
            throw new InvalidArgumentException('Invalid algorithm name.', 1);
        }
        // Check if the given hashing algorithm is supported.
        if ( crypto.getHashes().indexOf(algorithm) === -1 ){
            throw new InvalidArgumentException('Unsupported algorithm.', 2);
        }
        if ( this._hashingAlgorithm !== algorithm ){
            // Recompute the namespace hash as the algorithm has been change.
            this._digestNamespace();
        }
        this._hashingAlgorithm = algorithm;
        return this;
    }

    /**
     * Returns the hashing algorithm to use in keys hashing.
     *
     * @returns {string} A string containing the name of the hashing algorithm, if no algorithm has been defined, "md5" will be returned instead.
     */
    getHashingAlgorithm(){
        return this._hashingAlgorithm;
    }

    /**
     * Executes the actions that are meant to initialize the driver instance before its use, note that this method should be overridden as by default it actually does nothing.
     *
     * @returns {Promise<void>}
     *
     * @abstract
     * @async
     */
    async init(){}

    /**
     * Sets the namespace that will be used to group cached entries, this method is chainable.
     *
     * @param {string} namespace A string representing the namespace.
     *
     * @returns {CacheDriver}
     *
     * @throws {InvalidArgumentException} If an invalid namespace were given.
     */
    setNamespace(namespace){
        if ( namespace === '' || namespace === null ){
            this._namespace = this._namespaceHash = null;
            return this;
        }
        if ( typeof namespace !== 'string' ){
            throw new InvalidArgumentException('Invalid namespace.', 1);
        }
        if ( this._namespace !== namespace ){
            this._namespace = namespace;
            // Generate the namespace hash.
            this._digestNamespace();
        }
        return this;
    }

    /**
     * Returns the namespace that will be used to group cached entries.
     *
     * @returns {(string|null)} A string representing the namespace, if no namespace has been defined, null will be returned instead.
     */
    getNamespace(){
        return this._namespace;
    }

    /**
     * Sets if an older entry can be replaced by a newer one, if not, an exception will be thrown at write time, this method is chainable.
     *
     * @param overwrite If set to "true" entry overwrite will be allowed, otherwise not.
     *
     * @returns {CacheDriver}
     */
    setOverwrite(overwrite){
        this._overwrite = overwrite === true;
        return this;
    }

    /**
     * Returns if an older entry can be replaced by a newer one or not.
     *
     * @returns {boolean} If entry overwrite is allowed will be returned "true", otherwise "false".
     */
    getOverwrite(){
        return this._overwrite === true;
    }

    /**
     * Generates the hashes required to create the key's identifier according to the settings defined.
     *
     * @param {string} key A string containing the key to process.
     * @param {?CacheOptions} [options] The same options object that has been passed to the caller method.
     *
     * @returns {CachingKeyComponents} An object containing the generated components.
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
     */
    prepareKeyComponents(key, options = null){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        // Creating a hexadecimal hash from the identifier key in order to ensure length and a standard format, then prepare the object containing the components to return.
        return {
            key: crypto.createHash(algorithm).update(key).digest('hex'),
            namespace: this._getComputedNamespace(options),
            signature: CacheDriver.getGlobalPrefix()
        };
    }

    /**
     * Builds the entry's key associating to it the namespace that has been defined.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {boolean} [signature=false] If set to "true" the framework signature string will be added to the generated key (useful when using shared storage engines), otherwise not.
     * @param {?CacheOptions} [options] The same options object that has been passed to the caller method.
     *
     * @returns {string} A string representing the final entry's key.
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
     */
    prepareKey(key, signature = false, options = null){
        // Generate the key hash components, such as the key and the namespace hash.
        const components = this.prepareKeyComponents(key, options);
        return ( signature === true ? ( CacheDriver.getGlobalPrefix() + ':' ) : '' ) + components.namespace + ':' + components.key;
    }

    /**
     * Generates the hashes of each given key according to the settings defined.
     *
     * @param {string[]} keys A sequential array of strings representing the keys to process.
     * @param {?CacheOptions} [options] The same options object that has been passed to the caller method.
     *
     * @returns {MultiCachingKeyComponents} An object containing the generated components including the hash of each key.
     *
     * @throws {InvalidArgumentException} If an invalid keys array is given.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     */
    prepareMultipleKeyComponents(keys, options = null){
        if ( !Array.isArray(keys) || keys.length === 0 ){
            throw new InvalidArgumentException('Invalid keys array.', 3);
        }
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        // Generate the components' object.
        const components = {
            keys: [],
            namespace: this._getComputedNamespace(options),
            signature: CacheDriver.getGlobalPrefix()
        };
        components.keys = keys.map((key) => {
            if ( typeof key !== 'string' || key === '' ){
                throw new InvalidArgumentException('Invalid key.', 4);
            }
            // Creating a hexadecimal hash from the identifier key in order to ensure length and a standard format.
            return crypto.createHash(algorithm).update(key).digest('hex');
        });
        return components;
    }

    /**
     * Validates and generates an hash representation for each of the given keys.
     *
     * @param {string[]} keys A sequential array of strings representing the keys to process.
     * @param {boolean} [signature=false] If set to "true" the framework signature string will be added to the generated key (useful when using shared _storage engines), otherwise not.
     * @param {?CacheOptions} [options] The same options object that has been passed to the caller method.
     *
     * @returns {string[]} A sequential array of strings containing the processed keys.
     *
     * @throws {InvalidArgumentException} If an invalid keys array is given.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     */
    prepareMultipleKeys(keys, signature = false, options = null){
        if ( !Array.isArray(keys) || keys.length === 0 ){
            throw new InvalidArgumentException('Invalid keys array.', 3);
        }
        // Prepare the prefix that will be prepended to each key.
        const prefix = ( signature === true ? ( CacheDriver.getGlobalPrefix() + ':' ) : '' ) + this._getComputedNamespace(options) + ':';
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        // Validate and process each key.
        return keys.map((key) => {
            if ( typeof key !== 'string' || key === '' ){
                throw new InvalidArgumentException('Invalid key.', 4);
            }
            // Creating a hexadecimal hash from the identifier key in order to ensure length and a standard format, then prepend the generated prefix.
            return prefix + crypto.createHash(algorithm).update(key).digest('hex');
        });
    }

    /**
     * Checks if a connection has been defined and that it is ready to be used.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} if the driver that has been defined is not connected to the cache storage engine.
     */
    ensureConnection(){
        if ( this._connection === null ){
            throw new DriverNotDefinedException('No connection to the cache storage engine has been defined.', 1);
        }
        if ( !this._connection.isConnected() ){
            throw new DriverNotConnectedException('The driver defined is not connected to the cache storage engine.', 2);
        }
    }

    /**
     * Prepares a transaction using a given key.
     *
     * @param {string} key A string representing the item key.
     * @param {?CacheOptions} [options] The same options object that has been passed to the caller method.
     *
     * @returns {string} The processed key ready to be used.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} if the driver that has been defined is not connected to the cache storage engine.
     * @throws {InvalidArgumentException} If the given key is not valid.
     */
    prepareTransaction(key, options = null){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // Generate an hash based on the given key in order to ensure key length and compatibility.
        return this.prepareKey(key, true, options);
    }

    /**
     * Prepares a transaction using multiple keys.
     *
     * @param {string[]} keys A sequential array of strings containing all the key to validate and prepare for transaction.
     * @param {?CacheOptions} [options] The same options object that has been passed to the caller method.
     *
     * @returns {string[]} A sequential array of strings containing the processed keys.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} if the driver that has been defined is not connected to the cache storage engine.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     */
    prepareMultipleTransaction(keys, options){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // Validate and generate the has representation for each key.
        return this.prepareMultipleKeys(keys, true, options);
    }

    /**
     * Checks if the driver is ready to be used or not.
     *
     * @returns {boolean} If the cache driver is ready will be returned "true", otherwise "false".
     */
    isReady(){
        return this._ready === true;
    }

    /**
     * Sets the expiration time for entries, this method is chainable.
     *
     * @param {number} ttl An integer number greater than zero representing the expiration time in seconds, if zero is given, no TTL will be used.
     *
     * @returns {CacheDriver}
     */
    setTTL(ttl){
        this._ttl = ttl === null || isNaN(ttl) || ttl <= 0 ? null : ttl;
        return this;
    }

    /**
     * Returns the expiration time for entries.
     *
     * @returns {(number|null)} An integer number greater than zero representing the expiration time in seconds, if no TTL is going to be used, null will be returned instead.
     */
    getTTL(){
        return this._ttl;
    }

    /**
     * Computes the TTL that should be applied to the entries to store within the cache.
     *
     * @param {?CacheOptions} [options] An object representing the additional options that have been passed to the caller method.
     *
     * @returns {?number} An integer number greater than zero representing the TTL in seconds, if no TTL has been defined, null will be returned instead.
     */
    getComputedTTL(options){
        if ( options !== null && typeof options === 'object' && options.ttl !== null && !isNaN(options.ttl) && options.ttl > 0 ){
            return options.ttl;
        }
        return this.getTTL();
    }

    /**
     * Computes the TTL to apply to the entries and then returns it as date object.
     *
     * @param {?CacheOptions} [options] An object representing the additional options that have been passed to the caller method.
     *
     * @returns {?Date} An instance of the class "Date" representing the expiration date, if no TTL has been defined, null will be returned instead.
     */
    getComputedTTLAsDate(options){
        const ttl = this.getComputedTTL(options);
        if ( ttl !== null ){
            let now = new Date();
            now.setTime(now.getTime() + ( ttl * 1000 ));
            return now;
        }
        return null;
    }

    /**
     * Computes the TTL to apply to the entries and then returns it as UNIX timestamp.
     *
     * @param {?CacheOptions} [options] An object representing the additional options that have been passed to the caller method.
     * @param {boolean} [milliseconds=false] If set to "true" the returned timestamp will be expressed as milliseconds amount rather than seconds.
     *
     * @returns {?number} An integer number greater than zero representing he expiration date as UNIX timestamp (in seconds or milliseconds), if no TTL has been defined, null will be returned instead.
     */
    getComputedTTLAsTimestamp(options, milliseconds = false){
        const ttl = this.getComputedTTLAsDate(options);
        if ( milliseconds === true ){
            return ttl === null ? null : ttl.getDate();
        }
        return ttl === null ? null : Math.floor(ttl.getDate() / 1000);
    }

    /**
     * Saves an entry within the cache, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {*} value The value that will be cached.
     * @param {?CacheSetOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async set(key, value, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Returns an entry matching the given identifier key, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element key.
     * @param {?CacheGetOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<*>} The entry's value found or null if no entry was found.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async get(key, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Checks if a given key exists, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {?CacheExistsOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async exists(key, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of a given item, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, this item will last forever.
     * @param {?CacheExpireOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async expire(key, expire, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Removes an entry from the cache, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {?CacheRemoveOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async remove(key, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Drops all the entries stored within the cache, this method needs to be overridden and implemented.
     *
     * @param {?CacheInvalidateOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async invalidate(options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Increments the value of a given key by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheIncrementOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async increment(key, value, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Decrements the value of a given key by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {?CacheDecrementOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async decrement(key, value, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Saves multiple entries within the cache, this method needs to be overridden and implemented.
     *
     * @param {{string: *}} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {?CacheSetMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async setMulti(items, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Returns multiple entries matching the given identifier keys, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?CacheGetMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<{string: *}>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async getMulti(keys, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Checks if multiple given elements exist.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {boolean} [all=false] If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {?CacheExistsMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<boolean|{string: boolean}>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async existsMulti(keys, all = false, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?CacheRemoveMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async removeMulti(keys, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Increments the value of multiple elements by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheIncrementMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async incrementMulti(keys, value, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Decrements the value of multiple elements by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?number} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {?CacheDecrementMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async decrementMulti(keys, value, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of multiple elements, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, these items will last forever.
     * @param {?CacheExpireMultiOptions} [options] An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async expireMulti(keys, expire, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = CacheDriver;
