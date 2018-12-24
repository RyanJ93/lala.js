'use strict';

// Including Lala's modules.
const CacheDriver = require('../CacheDriver');
const {
    InvalidArgumentException,
    DuplicateEntryException
} = require('../../Exceptions');

class LocalCacheDriver extends CacheDriver {
    /**
     * The class constructor.
     */
    constructor(){
        super();
        this._storage = {};
        this._GCIntervalID = null;
        this.startGarbageCollector();
    }

    /**
     * Runs the garbage collector on all the stored items in order to remove expired items according to their TTL, this method is chainable.
     *
     * @returns {LocalCacheDriver}
     */
    runGarbageCollector(){
        let now = Date.now();
        // TODO: Optimize this loop and comparison.
        for ( let key in this._storage ){
            //
           if ( this._storage.hasOwnProperty(key) && this._storage[key].ttl !== null && this._storage[key].ttl < now ){
               delete this._storage[key];
           }
        }
        return this;
    }

    /**
     * Starts the garbage collector that will remove expired items according to their TTL, this method is chainable.
     *
     * @param {boolean} restart If set to "true" and if another garbage collector has been started, it will be stopped and another one will be started.
     *
     * @returns {LocalCacheDriver}
     */
    startGarbageCollector(restart = false){
        if ( restart !== true || this._GCIntervalID === null ){
            if ( this._GCIntervalID !== null ){
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
        if ( this._GCIntervalID !== null ){
            clearInterval(this._GCIntervalID);
        }
        return this;
    }

    /**
     * Stores a given value within the cache.
     *
     * @param {string} key A string representing the entry identifier key.
     * @param {any} value The value to store.
     * @param {object?} options An object containing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws InvalidArgumentException If an invalid identifier key were given.
     * @throws DuplicateEntryException If the given key were found and the "overwrite" option wasn't set to "true".
     */
    async set(key, value, options){
        key = this.prepareKey(key, false);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        // Get the item's expire date as integer number (if a TTL has been defined).
        let ttl = this.getComputedTTLAsTimestamp(options, true);
        // Prepare options.
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        // If the given key were found within the _storage, throw an exception.
        if ( options.overwrite !== true && this._storage.hasOwnProperty(key) ){
            throw new DuplicateEntryException('Key already existing.', 2);
        }
        this._storage[key] = {
            value: value,
            ttl: ttl
        };
    }

    /**
     * Returns an entry from the cache.
     *
     * @param {string} key A string representing the entry identifier.
     * @param {object?} options An object containing the additional options to consider.
     *
     * @returns {Promise<any>} The stored element fetched from the cache, if no element were found and the silent option is set, null will be returned instead.
     *
     * @throws InvalidArgumentException If an invalid identifier key were given.
     * @throws InvalidArgumentException If the given key were not found and the silent option were not set to "true".
     */
    async get(key, options){
        key = this.prepareKey(key, false);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        if ( !this._storage.hasOwnProperty(key) || ( this._storage[key].ttl !== null && this._storage[key].ttl < Date.now() ) ){
            if ( options.silent === true ){
                return null;
            }
            throw new InvalidArgumentException('Undefined key.', 2);
        }
        return this._storage[key].value;
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the key to look up.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the given key was found will be returned "true", otherwise "false".
     *
     * @throws InvalidArgumentException If an invalid key were given.
     */
    async exists(key, options){
        key = this.prepareKey(key, false);
        return this._storage.hasOwnProperty(key) && ( this._storage[key].ttl === null || this._storage[key].ttl >= Date.now() ) ;
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
     * @throws InvalidArgumentException If an invalid key were given.
     * @throws InvalidArgumentException If an invalid expiration time is given.
     *
     * @async
     */
    async expire(key, expire, options){
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 1);
        }
        key = this.prepareKey(key, false);
        if ( this._storage.hasOwnProperty(key) ){
            // If the given item exists update its expiration date, otherwise just ignore it.
            if ( expire === null || expire === 0 ){
                // If an empty date has been given, remove expiration date.
                this._storage[key].ttl = null;
                return;
            }
            this._storage[key].ttl = Date.now() + expire;
        }
    }

    /**
     * Removes an entry form the cache.
     *
     * @param {string} key A string representing the entry's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws InvalidArgumentException If an invalid key were given.
     */
    async remove(key, options){
        key = this.prepareKey(key, false);
        delete this._storage[key];
    }

    /**
     * Drops all the entries stored within the cache.
     *
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async invalidate(options){
        this._storage = {};
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
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async increment(key, value = null, options){
        key = this.prepareKey(key, false);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( this._storage.hasOwnProperty(key) && this._storage[key] !== null && !isNaN(this._storage[key].value) ){
            this._storage[key].value += value;
        }
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
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async decrement(key, value, options){
        let increment = value === null || isNaN(value) ? -1 : -value;
        await this.increment(key, increment);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {object} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws InvalidArgumentException If an invalid object containing the items to store is given.
     * @throws DuplicateEntryException If one of the given keys were found and the "overwrite" option wasn't set to "true".
     *
     * @async
     */
    async setMulti(items, options){
        // Validate and prepare the keys.
        let keys = Object.keys(items);
        let processedKeys = this.prepareMultipleKeys(keys, false);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        // Get the item's expire date as UNIX timestamp (if a TTL has been defined).
        let ttl = this.getComputedTTLAsTimestamp(options, true);
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        if ( options.overwrite ){
            processedKeys.forEach((key, index) => {
                if ( items.hasOwnProperty(keys[index]) ){
                    this._storage[key] = {
                        value: items[keys[index]],
                        ttl: ttl
                    };
                }
            });
            return;
        }
        let now = Date.now();
        processedKeys.forEach((key, index) => {
            if ( items.hasOwnProperty(keys[index]) ){
                if ( this._storage.hasOwnProperty(key) && ( this._storage[key].ttl === null || this._storage[key].ttl >= now ) ){
                    throw new DuplicateEntryException('Key already existing.', 2);
                }
                this._storage[key] = {
                    value: items[keys[index]],
                    ttl: ttl
                };
            }
        });
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async getMulti(keys, options){
        // Validate and prepare the keys.
        let processedKeys = this.prepareMultipleKeys(keys, false);
        let items = {};
        let now = Date.now();
        processedKeys.forEach((key, index) => {
            items[keys[index]] = this._storage.hasOwnProperty(key) && ( this._storage[key].ttl === null || this._storage[key].ttl >= now ) ? this._storage[key].value : null;
        });
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
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async existsMulti(keys, all = false, options){
        // Validate and prepare the keys.
        let processedKeys = this.prepareMultipleKeys(keys, false);
        let items = {};
        let now = Date.now();
        if ( all === true ){
            // TODO
            for ( let i = 0 ; i < processedKeys.length ; i++ ){
                if ( !this._storage.hasOwnProperty(processedKeys[i]) || ( this._storage[processedKeys[i]].ttl !== null && this._storage[processedKeys[i]].ttl < now ) ){
                    return false;
                }
            }
            return true;
        }
        // TODO
        processedKeys.forEach((key, index) => {
            items[keys[index]] = this._storage.hasOwnProperty(key) && ( this._storage[key].ttl === null || this._storage[key].ttl >= now );
        });
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
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async removeMulti(keys, options){
        // Validate and prepare the keys.
        keys = this.prepareMultipleKeys(keys, false);
        keys.forEach((key) => {
            if ( this._storage.hasOwnProperty(key) ){
                delete this._storage[key];
            }
        });
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
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async incrementMulti(keys, value, options){
        // Validate and prepare the keys.
        keys = this.prepareMultipleKeys(keys, false);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        // TODO
        keys.forEach((key) => {
            if ( this._storage.hasOwnProperty(key) && this._storage[key].value !== null && !isNaN(this._storage[key].value) ){
                this._storage[key].value += value;
            }
        });
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
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async expireMulti(keys, expire, options){
        // Validate and prepare the keys.
        keys = this.prepareMultipleKeys(keys, false);
        if ( expire !== null && ( isNaN(expire) || expire < 0 ) ){
            throw new InvalidArgumentException('Invalid expiration time.', 2);
        }
        // If an empty expiration time has been given, remove the TTL value to all the given items.
        if ( expire === null || expire === 0 ){
            keys.forEach((key) => {
                if ( this._storage.hasOwnProperty(key) ){
                    this._storage[key].ttl = null;
                }
            });
            return;
        }
        // Get the current date as UNIX timestamp and then compute the new TTL value.
        let now = Math.floor(( new Date() ).getTime() / 1000) + expire;
        // Set the new TTL date to every given item.
        keys.forEach((key) => {
            if ( this._storage.hasOwnProperty(key) ){
                this._storage[key].ttl = now;
            }
        });
    }
}

module.exports = LocalCacheDriver;