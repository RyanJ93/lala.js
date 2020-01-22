'use strict';

// Including Lala's modules.
const CacheDriver = require('../CacheDriver');
const {
    InvalidArgumentException,
    DuplicateEntryException
} = require('../../Exceptions');

/**
 * @typedef {CacheSetOptions} CacheLocalSetOptions The options accepted by the local driver during "set" operations.
 *
 * @property {?number} [ttl] An integer number greater than zero representing the duration of the element in seconds.
 * @property {boolean} [overwrite=false] If set to "true" and if the item already exists, it will be overwritten, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheGetOptions} CacheLocalGetOptions The options accepted by the local driver during "get" operations.
 *
 * @property {boolean} [silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
 */

/**
 * @typedef {CacheExistsOptions} CacheLocalExistsOptions The options accepted by the local driver during "exists" operations.
 */

/**
 * @typedef {CacheExpireOptions} CacheLocalExpireOptions The options accepted by the local driver during "expire" operations.
 */

/**
 * @typedef {CacheRemoveOptions} CacheLocalRemoveOptions The options accepted by the local driver during "remove" operations.
 */

/**
 * @typedef {CacheInvalidateOptions} CacheLocalInvalidateOptions The options accepted by the local driver during "invalidate" operations.
 */

/**
 * @typedef {CacheIncrementOptions} CacheLocalIncrementOptions The options accepted by the local driver during "increment" operations.
 *
 * @property {boolean} [create=false] If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
 * @property {boolean} [silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheDecrementOptions} CacheLocalDecrementOptions The options accepted by the local driver during "decrement" operations.
 *
 * @property {boolean} [create=false] If set to "true" and if the element doesn't exist it will be created applying the decrement to zero.
 * @property {boolean} [silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheSetMultiOptions} CacheLocalSetMultiOptions The options accepted by the local driver during multiple "set" operations.
 *
 * @property {?number} [ttl] An integer number greater than zero representing the duration of each element in seconds.
 * @property {boolean} [overwrite=false] If set to "true" and if an item already exists, it will be overwritten, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheOptions} CacheFileGetMultiOptions The options accepted by the file driver during multiple "get" operations.
 *
 * @property {boolean} [silent=false] If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
 */

/**
 * @typedef {CacheExistsMultiOptions} CacheLocalExistsMultiOptions The options accepted by the local driver during multiple "exists" operations.
 */

/**
 * @typedef {CacheRemoveMultiOptions} CacheLocalRemoveMultiOptions The options accepted by the local driver during multiple "remove" operations.
 */

/**
 * @typedef {CacheIncrementMultiOptions} CacheLocalIncrementMultiOptions The options accepted by the local driver during multiple "increment" operations.
 *
 * @property {boolean} [create=false] If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
 * @property {boolean} [silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheDecrementMultiOptions} CacheLocalDecrementMultiOptions The options accepted by the local driver during multiple "decrement" operations.
 *
 * @property {boolean} [create=false] If set to "true" and if the element doesn't exist it will be created applying the decrement to zero.
 * @property {boolean} [silent=false] If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
 */

/**
 * @typedef {CacheExpireMultiOptions} CacheLocalExpireMultiOptions The options accepted by the local driver during multiple "expire" operations.
 */

/**
 * The local storage engine, a simple alternative to use whenever building a really simple app and external tools such as Redis or Memcached setup should be avoided.
 */
class LocalCacheDriver extends CacheDriver {
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
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {{string: {value: *, ttl: number}}} _storage An used to store the cached data having as key the item key and as value an object containing both the item value and its expiration time.
         *
         * @private
         */
        this._storage = {};

        /**
         * @type {?number} _GCIntervalID An integer number greater or equal than zero containing the ID of the timer that periodically runs the garbage collector in order to remove expired items.
         *
         * @private
         */
        this._GCIntervalID = 0;

        this.startGarbageCollector();
    }

    /**
     * Runs the garbage collector on all the stored items in order to remove expired items according to their TTL, this method is chainable.
     *
     * @returns {LocalCacheDriver}
     */
    runGarbageCollector(){
        const now = Date.now();
        for ( let key in this._storage ){
            // Check if the item has a TTL and if it has expired.
            if ( this._storage.hasOwnProperty(key) && this._storage[key].ttl !== null && this._storage[key].ttl < now ) {
                delete this._storage[key];
            }
        }
        return this;
    }

    /**
     * Starts the garbage collector that will remove expired items according to their TTL, this method is chainable.
     *
     * @param {boolean} [restart=false] If set to "true" and if another garbage collector has been started, it will be stopped and another one will be started.
     *
     * @returns {LocalCacheDriver}
     */
    startGarbageCollector(restart = false){
        if ( restart !== true || this._GCIntervalID === 0 ){
            if ( this._GCIntervalID !== 0 ){
                clearInterval(this._GCIntervalID);
            }
            this._GCIntervalID = setInterval(() => {
                this.runGarbageCollector();
            }, 1000);
        }
        return this;
    }

    /**
     * Stops the garbage collector, this method is chainable.
     *
     * @returns {LocalCacheDriver}
     */
    stopGarbageCollector(){
        if ( this._GCIntervalID !== 0 ){
            clearInterval(this._GCIntervalID);
        }
        return this;
    }

    /**
     * Stores a given value within the cache.
     *
     * @param {string} key A string representing the entry identifier key.
     * @param {*} value The value to store.
     * @param {?CacheLocalSetOptions} [options] An optional object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid identifier key were given.
     * @throws {DuplicateEntryException} If the given key were found and the "overwrite" option wasn't set to "true".
     */
    async set(key, value, options = null){
        const components = this.prepareKeyComponents(key, options);
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Prepare options.
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        if ( this._storage.hasOwnProperty(components.namespace) ){
            // If the given key were found within the _storage, throw an exception.
            if ( options.overwrite !== true && this._storage[components.namespace].hasOwnProperty(key) ){
                throw new DuplicateEntryException('Key already existing.', 2);
            }
        }else{
            this._storage[components.namespace] = {};
        }
        this._storage[components.namespace][components.key] = {
            value: value,
            ttl: this.getComputedTTLAsTimestamp(options, true)
        };
    }

    /**
     * Returns an entry from the cache.
     *
     * @param {string} key A string representing the entry identifier.
     * @param {?CacheLocalGetOptions} options An object containing the additional options to consider.
     *
     * @returns {Promise<*>} The stored element fetched from the cache, if no element were found and the silent option is set, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid identifier key were given.
     * @throws {InvalidArgumentException} If the given key were not found and the silent option were not set to "true".
     */
    async get(key, options = null){
        const components = this.prepareKeyComponents(key, options);
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        let element = null;
        // Check is this element exists.
        if ( this._storage.hasOwnProperty(components.namespace) && this._storage[components.namespace].hasOwnProperty(components.key) ){
            element = this._storage[components.namespace][components.key];
        }
        // Check if the element has not expired yet.
        if ( element === null || ( element.ttl !== null && element.ttl < Date.now() ) ){
            if ( options.silent !== true ){
                throw new InvalidArgumentException('Undefined key.', 2);
            }
            element = null;
        }
        return element === null ? null : element.value;
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the key to look up.
     * @param {?CacheLocalExistsOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<boolean>} If the given key was found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid key were given.
     */
    async exists(key, options = null){
        const components = this.prepareKeyComponents(key, options);
        let exists = false;
        if ( this._storage.hasOwnProperty(components.namespace) && this._storage[components.namespace].hasOwnProperty(components.key) ){
            // This elements exists, check if it has not expired yet.
            exists = this._storage[components.namespace][components.key].ttl === null || this._storage[components.namespace][components.key].ttl >= Date.now();
        }
        return exists;
    }

    /**
     * Sets or alter the expiration date, namely TTL, of a given item.
     *
     * @param {string} key A string representing the element's key.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, this item will last forever.
     * @param {?CacheLocalExpireOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid key were given.
     * @throws {InvalidArgumentException} If an invalid expiration time is given.
     *
     * @async
     */
    async expire(key, expire, options = null){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 1);
        }
        const components = this.prepareKeyComponents(key, options);
        if ( this._storage.hasOwnProperty(components.namespace) && this._storage[components.namespace].hasOwnProperty(components.key) ){
            // If the given item exists update its expiration date, otherwise just ignore it.
            if ( expire === null || expire === 0 ){
                // If an empty date has been given, remove expiration date.
                this._storage[components.namespace][components.key].ttl = null;
                return;
            }
            this._storage[components.namespace][components.key].ttl = Date.now() + expire;
        }
    }

    /**
     * Removes an entry form the cache.
     *
     * @param {string} key A string representing the entry's key.
     * @param {?CacheLocalRemoveOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid key were given.
     */
    async remove(key, options = null){
        const components = this.prepareKeyComponents(key, options);
        if ( this._storage.hasOwnProperty(components.namespace) ){
            delete this._storage[components.namespace][components.key];
        }
    }

    /**
     * Drops all the entries stored within the cache.
     *
     * @param {?CacheLocalInvalidateOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async invalidate(options){
        delete this._storage[this._getComputedNamespace(options)];
    }

    /**
     * Increments the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {?number} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheLocalIncrementOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {InvalidArgumentException} If the given key was not found.
     * @throws {InvalidArgumentException} If the given item is not a numeric value.
     *
     * @async
     */
    async increment(key, value = 1, options = null){
        const components = this.prepareKeyComponents(key, options);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( options === null || typeof options !== 'object' ){
            options = {create: false, silent: false};
        }
        const exists = this._storage.hasOwnProperty(components.namespace) && this._storage[components.namespace].hasOwnProperty(components.key);
        if ( !exists || ( this._storage[components.namespace][components.key].ttl !== null && this._storage[components.namespace][components.key].ttl < Date.now() ) ){
            if ( options.create === true ){
                if ( !this._storage.hasOwnProperty(components.namespace) ){
                    this._storage[components.namespace] = {};
                }
                // Create the item if the given one doesn't exist or it has expired.
                this._storage[components.namespace][components.key] = {
                    value: value,
                    ttl: null
                };
            }else if ( options.silent !== true ){
                throw new InvalidArgumentException('Undefined key.', 2);
            }
        }else{
            // Check if the item's value can be incremented and find out how to do this.
            switch ( typeof this._storage[components.namespace][components.key].value ){
                case 'number': {
                    this._storage[components.namespace][components.key].value += value;
                }break;
                case 'bigint': {
                    this._storage[components.namespace][components.key].value += BigInt(value);
                }break;
                default: {
                    // The item is not a numeric value.
                    if ( options.silent !== true ){
                        throw new InvalidArgumentException('The given item is not a numeric value.', 3);
                    }
                }break;
            }
        }
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {?number} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheDecrementOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
     * @throws {InvalidArgumentException} If the given key was not found.
     * @throws {InvalidArgumentException} If the given item is not a numeric value.
     *
     * @async
     */
    async decrement(key, value = 1, options = null){
        this.increment(key, ( value === null || isNaN(value) ? -1 : -value ), options);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {{string: *}} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {?CacheLocalSetMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid object containing the items to store is given.
     * @throws {DuplicateEntryException} If one of the given keys were found and the "overwrite" option wasn't set to "true".
     *
     * @async
     */
    async setMulti(items, options = null){
        // Validate and prepare the keys.
        const keys = Object.keys(items);
        const components = this.prepareMultipleKeyComponents(keys, options);
        if ( options === null || typeof options !== 'object' ){
            options = {ttl: null, overwrite: false};
        }
        // Get the item's expire date as UNIX timestamp (if a TTL has been defined).
        const ttl = this.getComputedTTLAsTimestamp(options, true);
        const length = components.keys.length;
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        if ( !this._storage.hasOwnProperty(components.namespace) ){
            this._storage[components.namespace] = {};
        }
        if ( options.overwrite ){
            // Insert items without care if they exist or not, just brutally replace them.
            for ( let i = 0 ; i < length ; i++ ){
                if ( items.hasOwnProperty(keys[i]) ){
                    this._storage[components.namespace][components.keys[i]] = {
                        value: items[keys[i]],
                        ttl: ttl
                    };
                }
            }
        }else{
            const now = Date.now();
            for ( let i = 0 ; i < length ; i++ ){
                if ( items.hasOwnProperty(keys[i]) ){
                    if ( this._storage[components.namespace].hasOwnProperty(components.keys[i]) && ( this._storage[components.keys[i]].ttl === null || this._storage[components.keys[i]].ttl >= now ) ){
                        throw new DuplicateEntryException('Key already existing.', 2);
                    }
                    this._storage[components.namespace][components.keys[i]] = {
                        value: items[keys[i]],
                        ttl: ttl
                    };
                }
            }
        }
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?CacheFileGetMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<{string: *}>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If one of the given key was not found.
     *
     * @async
     */
    async getMulti(keys, options = null){
        // Validate and prepare the keys.
        const components = this.prepareMultipleKeyComponents(keys, options);
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        const items = {};
        const now = Date.now();
        const length = components.keys.length;
        if ( options.silent === true && this._storage.hasOwnProperty(components.namespace) ){
            // Fetch the requested items, if an item is not found, set the item value to null for the returned object.
            for ( let i = 0 ; i < length ; i++ ){
                items[keys[i]] = null;
                if ( this._storage[components.namespace].hasOwnProperty(components.keys[i]) ){
                    if ( this._storage[components.namespace][components.keys[i]].ttl === null || this._storage[components.namespace][components.keys[i]].ttl >= now ){
                        items[keys[i]] = this._storage[components.namespace][components.keys[i]].value;
                    }
                }
            }
        }else if ( options.silent !== true && this._storage.hasOwnProperty(components.namespace) ){
            // Fetch the requested items, if an item is not found, thrown an exception.
            for ( let i = 0 ; i < length ; i++ ){
                if ( !this._storage[components.namespace].hasOwnProperty(components.keys[i]) ){
                    throw new InvalidArgumentException('Undefined key.', 2);
                }
                if ( this._storage[components.namespace][components.keys[i]].ttl !== null && this._storage[components.namespace][components.keys[i]].ttl < now ){
                    throw new InvalidArgumentException('Undefined key.', 2);
                }
                items[keys[i]] = this._storage[components.namespace][components.keys[i]].value;
            }
        }else if ( options.silent !== true && !this._storage.hasOwnProperty(components.namespace) ){
            throw new InvalidArgumentException('Undefined key.', 2);
        }
        return items;
    }

    /**
     * Checks if multiple given elements exist.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {boolean} [all=false] If set to "true" will be returned the boolean value "true" only if all the given keys exist, otherwise will be returned an object having as key the item key and as value a boolean value.
     * @param {?CacheLocalExistsMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<boolean|{string: boolean}>} If the param "all" has been set to "true" all the given keys will be tested simultaneously and a boolean will be returned, otherwise an object having as key the item key and as value "true" if the item exists.
     *
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     *
     * @async
     */
    async existsMulti(keys, all = false, options = null){
        // Validate and prepare the keys.
        const components = this.prepareMultipleKeyComponents(keys, options);
        const now = Date.now();
        const length = components.keys.length;
        let result;
        if ( all === true ){
            // Check if the whole components.namespace exists.
            result = this._storage.hasOwnProperty(components.namespace);
            let i = 0;
            while ( result && i < length ){
                if ( !this._storage[components.namespace].hasOwnProperty(components.keys[i]) || ( this._storage[components.namespace][components.keys[i]].ttl !== null && this._storage[components.namespace][components.keys[i]].ttl < now ) ){
                    result = false;
                }
                i++;
            }
        }else{
            result = {};
            // Check if the whole components.namespace exists.
            if ( this._storage.hasOwnProperty(components.namespace) ){
                for ( let i = 0 ; i < length ; i++ ){
                    result[keys[i]] = this._storage[components.namespace].hasOwnProperty(components.keys[i]) && ( this._storage[components.namespace][components.keys[i]].ttl === null || this._storage[components.namespace][components.keys[i]].ttl >= now )
                }
            }
        }
        return result;
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?CacheLocalRemoveMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     *
     * @async
     */
    async removeMulti(keys, options = null){
        // Validate and prepare the keys.
        const components = this.prepareMultipleKeyComponents(keys, options);
        const length = components.keys.length;
        if ( this._storage.hasOwnProperty(components.namespace) ){
            for ( let i = 0 ; i < length ; i++ ){
                if ( this._storage[components.namespace].hasOwnProperty(components.keys[i]) ){
                    delete this._storage[components.namespace][components.keys[i]];
                }
            }
        }
    }

    /**
     * Increments the value of multiple elements by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?number} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheLocalIncrementMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If one of the given key was not found.
     * @throws {InvalidArgumentException} If one of the given item is not a numeric value.
     *
     * @async
     */
    async incrementMulti(keys, value = 1, options = null){
        // Validate and prepare the keys.
        const components = this.prepareMultipleKeyComponents(keys, options);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( options === null || typeof options !== 'object' ){
            options = {create: false, silent: false};
        }
        if ( options.create !== true && !this._storage.hasOwnProperty(components.namespace) ){
            throw new InvalidArgumentException('Undefined key.', 2);
        }
        if ( options.create === true && !this._storage.hasOwnProperty(components.namespace) ){
            this._storage[components.namespace] = {};
        }
        const now = Date.now();
        const length = components.keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( !this._storage[components.namespace].hasOwnProperty(components.keys[i]) || ( this._storage[components.namespace][components.keys[i]].ttl !== null && this._storage[components.namespace][components.keys[i]].ttl < now ) ){
                // The element doesn't exist or it has expired.
                if ( options.create === true ){
                    this._storage[components.namespace][components.keys[i]] = {
                        value: value,
                        ttl: null
                    };
                }else if ( options.silent !== true ){
                    throw new InvalidArgumentException('Undefined key.', 2);
                }
            }else{
                // Check if the item's value can be incremented and find out how to do this.
                switch ( typeof this._storage[components.namespace][components.keys[i]].value ){
                    case 'number': {
                        this._storage[components.namespace][components.keys[i]].value += value;
                    }break;
                    case 'bigint': {
                        this._storage[components.namespace][components.keys[i]].value += BigInt(value);
                    }break;
                    default: {
                        // The item is not a numeric value.
                        if ( options.silent !== true ){
                            throw new InvalidArgumentException('The given item is not a numeric value.', 3);
                        }
                    }break;
                }
            }
        }
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {?number} [value=1] A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {?CacheLocalDecrementMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     * @throws {InvalidArgumentException} If one of the given key was not found.
     * @throws {InvalidArgumentException} If one of the given item is not a numeric value.
     *
     * @async
     */
    async decrementMulti(keys, value = 1, options = null){
        await this.incrementMulti(keys, ( value === null || isNaN(value) ? -1 : -value ), options);
    }

    /**
     * Sets or alter the expiration date, namely TTL, of multiple elements.
     *
     * @param {string[]} keys A sequential array of strings containing the keys.
     * @param {number} expire An integer number greater than zero representing the expiration time expressed in seconds, if set to null, these items will last forever.
     * @param {?CacheLocalExpireMultiOptions} [options] An object containing some additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid array containing the keys is given.
     *
     * @async
     */
    async expireMulti(keys, expire, options = null){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 2);
        }
        // Validate and prepare the keys.
        const components = this.prepareMultipleKeyComponents(keys, options);
        const length = components.keys.length;
        // If an empty expiration time has been given, remove the TTL value to all the given items.
        if ( expire === null || expire === 0 ){
            if ( this._storage.hasOwnProperty(components.namespace) ){
                for ( let i = 0 ; i < length ; i++ ){
                    if ( this._storage[components.namespace].hasOwnProperty(components.keys[i]) ){
                        this._storage[components.namespace][components.keys[i]].ttl = null;
                    }
                }
            }
        }else{
            // Get the current date as UNIX timestamp and then compute the new TTL value.
            const now = Math.floor(( new Date() ).getTime() / 1000) + expire;
            if ( this._storage.hasOwnProperty(components.namespace) ){
                // Set the new TTL date to every given item.
                for ( let i = 0 ; i < length ; i++ ){
                    if ( this._storage[components.namespace].hasOwnProperty(components.keys[i]) ){
                        this._storage[components.namespace][components.keys[i]].ttl = now;
                    }
                }
            }
        }
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

module.exports = LocalCacheDriver;