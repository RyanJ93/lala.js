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

/* abstract */ class CacheDriver {
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
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Connection' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
        this._namespace = null;
        this._namespaceHash = null;
        this._ready = true;
        this._ttl = null;
        this._overwrite = false;
        this._connection = null;
        this._options = {};
        this._hashingAlgorithm = 'md5';
        this._path = null;
    }

    /**
     * Sets the custom options to consider, this method is chainable.
     *
     * @param {object<string, any>} options An object containing the custom options.
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
     * @returns {object<string, any>} An object containing the custom options.
     *
     * @returns {CacheDriver}
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
            // Get the algorithm to use in namespace hashing.
            const algorithm = this.getHashingAlgorithm();
            this._namespace = namespace;
            // Generate a hash from the namespace in order to ensure length and a standard format.
            this._namespaceHash = crypto.createHash(algorithm).update(namespace).digest('hex');
        }
        return this;
    }

    /**
     * Returns the namespace that will be used to group cached entries.
     *
     * @returns {string|null} A string representing the namespace, if no namespace has been defined, null will be returned instead.
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
     *
     * @returns {{namespace: null|string, key: string, signature: string}} An object containing the generated components.
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
     */
    prepareKeyComponents(key){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        // Creating a hexadecimal hash from the identifier key in order to ensure length and a standard format, then prepare the object containing the components to return.
        return {
            key: crypto.createHash(algorithm).update(key).digest('hex'),
            namespace: this._namespaceHash === null ? '*' : this._namespaceHash,
            signature: CacheDriver.getGlobalPrefix()
        };
    }

    /**
     * Builds the entry's key associating to it the namespace that has been defined.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {boolean} signature If set to "true" the framework signature string will be added to the generated key (useful when using shared _storage engines), otherwise not.
     *
     * @returns {string} A string representing the final entry's key.
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
     */
    prepareKey(key, signature = false){
        // Generate the key hash components, such as the key and the namespace hash.
        const components = this.prepareKeyComponents(key);
        // Add the Framework's signature to the generated identifier.
        let entry = signature === true ? ( CacheDriver.getGlobalPrefix() + ':' ) : '';
        if ( components.namespace !== null ){
            entry += components.namespace + ':';
        }
        return entry + components.key;
    }

    /**
     * Generates the hashes of each given key according to the settings defined.
     *
     * @param {string[]} keys A sequential array of strings representing the keys to process.
     *
     * @returns {{signature: string, keys: Array, namespace: null}} An object containing the generated components including the hash of each key.
     *
     * @throws {InvalidArgumentException} If an invalid keys array is given.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     */
    prepareMultipleKeyComponents(keys){
        if ( !Array.isArray(keys) || keys.length === 0 ){
            throw new InvalidArgumentException('Invalid keys array.', 3);
        }
        // Get the algorithm to use in namespace hashing.
        const algorithm = this.getHashingAlgorithm();
        // Generate the components' object.
        let components = {
            keys: [],
            namespace: this._namespaceHash === null ? '*' : this._namespaceHash,
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
     * @param {boolean} signature If set to "true" the framework signature string will be added to the generated key (useful when using shared _storage engines), otherwise not.
     *
     * @returns {string[]} A sequential array of strings containing the processed keys.
     *
     * @throws {InvalidArgumentException} If an invalid keys array is given.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     */
    prepareMultipleKeys(keys, signature = false){
        if ( !Array.isArray(keys) || keys.length === 0 ){
            throw new InvalidArgumentException('Invalid keys array.', 3);
        }
        // Prepare the prefix that will be prepended to each key.
        let prefix = signature === true ? ( CacheDriver.getGlobalPrefix() + ':' ) : '';
        if ( this._namespaceHash !== null ){
            prefix += this._namespaceHash + ':';
        }
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
     *
     * @returns {string} The processed key ready to be used.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} if the driver that has been defined is not connected to the cache storage engine.
     * @throws {InvalidArgumentException} If the given key is not valid.
     */
    prepareTransaction(key){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // Generate an hash based on the given key in order to ensure key length and compatibility.
        return this.prepareKey(key, true);
    }

    /**
     * Prepares a transaction using multiple keys.
     *
     * @param {string[]} keys A sequential array of strings containing all the key to validate and prepare for transaction.
     *
     * @returns {string[]} A sequential array of strings containing the processed keys.
     *
     * @throws {DriverNotDefinedException} If no connection to the cache storage engine has been defined.
     * @throws {DriverNotConnectedException} if the driver that has been defined is not connected to the cache storage engine.
     * @throws {InvalidArgumentException} If an invalid key is found within the given array, or if the whole array is invalid.
     */
    prepareMultipleTransaction(keys){
        // Checking that a connection has been defined and that is ready to be used.
        this.ensureConnection();
        // Validate and generate the has representation for each key.
        return this.prepareMultipleKeys(keys, true);
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
     * @returns {number|null} An integer number greater than zero representing the expiration time in seconds, if no TTL is going to be used, null will be returned instead.
     */
    getTTL(){
        return this._ttl;
    }

    /**
     * Computes the TTL that should be applied to the entries to store within the cache.
     *
     * @param {object} options An object representing the additional options that have been passed to the original method.
     *
     * @returns {number|null} An integer number greater than zero representing the TTL in seconds, if no TTL has been defined, null will be returned instead.
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
     * @param {object} options An object representing the additional options that have been passed to the original method.
     *
     * @returns {Date|null} An instance of the class "Date" representing the expiration date, if no TTL has been defined, null will be returned instead.
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
     * @param {object} options An object representing the additional options that have been passed to the original method.
     * @param {boolean} milliseconds If set to "true" the returned timestamp will be expressed as milliseconds amount rather than seconds.
     *
     * @returns {number|null} An integer number greater than zero representing he expiration date as UNIX timestamp (in seconds or milliseconds), if no TTL has been defined, null will be returned instead.
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
     * @param {object<string, any>?} options An object representing the additional options to consider.
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
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<any>} The entry's value found or null if no entry was found.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async get(key, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Checks if a given key exists, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async exists(key, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of a given item, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, this item will last forever.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async expire(key, expire, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Removes an entry from the cache, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async remove(key, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Drops all the entries stored within the cache, this method needs to be overridden and implemented.
     *
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async invalidate(options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Increments the value of a given key by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async increment(key, value, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Decrements the value of a given key by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string} key A string representing the element's key.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async decrement(key, value, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Saves multiple entries within the cache, this method needs to be overridden and implemented.
     *
     * @param {object} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async setMulti(items, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Returns multiple entries matching the given identifier keys, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async getMulti(keys, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Checks if multiple given elements exist.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {boolean} all If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean|object>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async existsMulti(keys, all = false, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async removeMulti(keys, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Increments the value of multiple elements by a given delta, this method needs to be overridden and implemented.
     * 
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async incrementMulti(keys, value, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Decrements the value of multiple elements by a given delta, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async decrementMulti(keys, value, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of multiple elements, this method needs to be overridden and implemented.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, these items will last forever.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async expireMulti(keys, expire, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = CacheDriver;