'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const CacheDriver = require('../CacheDriver');
const {
    InvalidArgumentException,
    RuntimeException,
    MisconfigurationException,
    DuplicateEntryException
} = require('../../Exceptions');
const { serialize, unserialize } = require('../../helpers');

class FileCacheDriver extends CacheDriver {
    /**
     * Sets up the driver from the configuration file loaded, currently not supported.
     * 
     * @returns {Promise<void>}
     * 
     * @async
     */
    static async setup(){}

    /**
     * The class constructor.
     */
    constructor(){
        super();
    }

    /**
     * Sets the path to the directory where the cached data will be stored at, this method is chainable.
     *
     * @param {string} path A string representing the path where the cached data will be stored at, if the given directory doesn't exist, it will be created on the fly.
     *
     * @returns {FileCacheDriver}
     *
     * @throws InvalidArgumentException If the given path is not valid.
     * @throws RuntimeException If an error occurs while creating the storage directory.
     * @throws RuntimeException If an error occurs while fetching information about the given path.
     * @throws InvalidArgumentException If the given path leads to a file instead of a directory.
     */
    setPath(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        // Ensure that the given path ends by "/".
        if ( path.charAt(path.length - 1) !== '/' ){
            path = path + '/';
        }
        let stat = null;
        try{
            // Check if the given path exists and if it is a directory.
            stat = filesystem.statSync(path);
        }catch(ex){
            if ( ex.code === 'ENOENT' ){
                try{
                    // Create the directory if it doesn't exist.
                    filesystem.mkdirSync(path, {
                        recursive: true
                    });
                    this._path = path;
                    return this;
                }catch(ex){
                    throw new RuntimeException('Unable to create the storage directory.', 3, ex);
                }
            }
            throw new RuntimeException('Unable to stat the given path.', 4, ex);
        }
        if ( stat === null || !stat.isDirectory() ){
            throw new InvalidArgumentException('Invalid path.', 2);
        }
        this._path = path;
        return this;
    }

    /**
     * Returns the path to the directory where the cached data will be stored at.
     *
     * @returns {string|null} A string representing the path where the cached data will be stored at.
     */
    getPath(){
        return this._path;
    }

    /**
     * Prepares a transaction by ensuring that the storage directory has been defined and generating an hash from the given key.
     *
     * @param {string} key A string representing the item key.
     *
     * @returns {{namespace: null|string, key: string, signature: string}} An object containing the generated components.
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @private
     */
    _prepareTransaction(key){
        // Check if a storage directory has been defined.
        if ( this.getPath() === null ){
            throw new MisconfigurationException('No storage directory defined.', 1);
        }
        // Generate the key hash components from the given key.
        return this.prepareKeyComponents(key);
    }

    /**
     * Prepares a transaction that will involve multiple keys by ensuring that the storage directory has been defined and generating the hash of the given keys.
     *
     * @param {string[]} keys A sequential array of strings containing the keys to process.
     *
     * @returns {{signature: string, keys: Array, namespace: null}} An object containing the generated components.
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid key is found within the given array, or if the whole array is invalid.
     *
     * @private
     */
    _prepareMultipleTransaction(keys){
        // Check if a storage directory has been defined.
        if ( this.getPath() === null ){
            throw new MisconfigurationException('No storage directory defined.', 1);
        }
        // Generate the hashes for each of the given keys.
        return this.prepareMultipleKeyComponents(keys);
    }

    /**
     * Writes the given data to a given file.
     *
     * @param {string} path A string representing the path where the file should be located.
     * @param {string} contents A string containing the data to write un the given file.
     * @param {boolean} overwrite If set to "true" and if the file already exists, it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws RuntimeException If an error occurs while writing the file.
     * @throws RuntimeException If an error occurs while creating directory for the namespace.
     * @throws DuplicateEntryException If the file already exists and it is not going to be overwritten.
     *
     * @async
     * @private
     */
     static async _writeFile(path, contents, overwrite = false){
        await (new Promise((resolve, reject) => {
            // Try writing the given data to the file.
            filesystem.writeFile(path, contents, {
                encoding: 'utf8',
                flag: overwrite ? 'w' : 'wx'
            }, (error) => {
                if ( error !== null ){
                    if ( error.code === 'ENOENT' ){
                        // Get the directory where the file should be located.
                        const index = path.lastIndexOf('/');
                        const directory = index === -1 ? path : path.substr(0, index);
                        try{
                            // Create the directory.
                            filesystem.mkdirSync(directory, {
                                recursive: true
                            });
                        }catch(ex){
                            reject(new RuntimeException('Unable to create the directory for the namespace.', 3, ex));
                        }
                        // Try over again to write the file.
                        FileCacheDriver._writeFile(path, contents, overwrite).then(() => {
                            resolve();
                        }).catch((ex) => {
                            reject(ex);
                        });
                    }else if ( error.code === 'EEXIST' ){
                        reject(new DuplicateEntryException('Key already existing.', 4));
                    }else{
                        reject(new RuntimeException('Unable to write the file.', 2, error));
                    }
                }else{
                    resolve();
                }
            });
        }));
    }

    /**
     * Reads all the contents from a file given the path where it is located at.
     *
     * @param path A string containing the path to the file ot read.
     * @param silent If set to "true" and if the file doesn't exist null will be returned instead of throwning an exception.
     *
     * @returns {Promise<string|null>}
     *
     * @throws InvalidArgumentException If the file doesn't exist, in this case, it means that the item associated to the were not found.
     * @throws RuntimeException If an error occurs while reading the file.
     *
     * @async
     * @private
     */
    static async _readFile(path, silent = false){
         return await new Promise( (resolve, reject) => {
             filesystem.readFile(path, {
                 encoding: 'utf8'
             }, (error, contents) => {
                 if ( error !== null ) {
                     if ( error.code === 'ENOENT' ){
                         if ( silent === true ){
                             return resolve(null);
                         }
                         return reject(new InvalidArgumentException('Undefined key.', 2));
                     }
                     return reject(new RuntimeException('An error occurred while reading the file.', 3, error));
                 }
                 resolve(contents.toString());
             });
         });
    }

    /**
     * Saves an entry within the cache.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {*} value The value that will be cached.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.overwrite If set to "true" and if the item already exists, it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws DuplicateEntryException If the given key were found and the "overwrite" option wasn't set to "true".
     * @throws RuntimeException If an error occurs while writing the file.
     *
     * @async
     */
    async set(key, value, options){
        const components = this._prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {overwrite: false};
        }
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        const path = this.getPath() + components.namespace + '/' + components.key + '.cache';
        // Serialize the original value into JSON string representation.
        const serialization = serialize(value);
        // Generate the file content.
        const contents = serialization.dataTypeCode.toString() + ':' + serialization.value;
        // Write the generated content to the file.
        await FileCacheDriver._writeFile(path, contents, options.overwrite);
    }

    /**
     * Returns an entry matching the given identifier key.
     *
     * @param {string} key A string representing the element key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.silent If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
     *
     * @returns {Promise<any>} The entry's value found or null if no entry was found and the "silent" was set to "true".
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws RuntimeException If an error occurs while reading the file.
     *
     * @async
     */
    async get(key, options){
        const components = this._prepareTransaction(key);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        const path = this.getPath() + components.namespace + '/' + components.key + '.cache';
        // Fetch the item's contents from its file.
        const contents = await FileCacheDriver._readFile(path, options.silent === true);
        if ( contents === null ){
            return null;
        }
        // Get the type of the original content that has been serialized.
        const dataTypeCode = parseInt(contents.charAt(0));
        // Convert the value from the serialized string into the original value.
        return unserialize(contents.substr(2), dataTypeCode);
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async exists(key, options) {
        const components = this._prepareTransaction(key);
        const path = this.getPath() + components.namespace + '/' + components.key + '.cache';
        return filesystem.existsSync(path) === true;
    }

    /**
     * Removes an entry from the cache.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws RuntimeException If an error occurs while removing the file.
     *
     * @async
     */
    async remove(key, options){
        const components = this._prepareTransaction(key);
        const path = this.getPath() + components.namespace + '/' + components.key + '.cache';
        await (new Promise((resolve, reject) => {
            // Directly remove the file associated with the given item.
            filesystem.unlink(path, (error) => {
                if ( error !== null && error.code !== 'ENOENT' ){
                    return reject(new RuntimeException('An error occurred while removing the entry.', 2, error));
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
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws RuntimeException If an error occurs while removing one or more files.
     *
     * @async
     */
    async invalidate(options){
        let path = this.getPath();
        path += ( this._namespaceHash === null ? '*' : this._namespaceHash ) + '/';
        await (new Promise((resolve, reject) => {
            // Scan the directory in order to obtain a complete list of all the contained files.
            filesystem.readdir(path, {
                encoding: 'utf8'
            }, (error, list) => {
                if ( error !== null ){
                    return reject(new RuntimeException('Unable to get the list of all the items to remove.', 2, error));
                }
                let processes = [];
                // Check each file and remove the eligible ones.
                const length = list.length;
                for ( let i = 0 ; i < length ; i++ ){
                    if ( list[i] !== '.' && list[i] !== '..' ){
                        const index = list[i].lastIndexOf('.');
                        const extension = index !== -1 ? list[i].substr(index + 1) : null;
                        // Check if this file is a cache file by its extension.
                        if ( extension === 'cache' ){
                            processes.push(new Promise((resolve, reject) => {
                                // Remove the file.
                                filesystem.unlink(path + list[i], (error) => {
                                    if ( error !== null && error.code !== 'ENOENT' ){
                                        return reject(error);
                                    }
                                    resolve();
                                })
                            }));
                        }
                    }
                }
                Promise.all(processes).then(() => {
                    resolve();
                }).catch((ex) => {
                    return reject(new RuntimeException('An error occurred while removing the item.', 3, ex));
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
     * @param {boolean?} options.create If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean?} options.silent If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws InvalidArgumentException If the given key was not found.
     * @throws InvalidArgumentException If the given item is not a numeric value.
     * @throws RuntimeException If an error occurs while reading the file.
     * @throws RuntimeException If an error occurs while writing the file.
     *
     * @async
     */
    async increment(key, value = null, options){
        let components = this._prepareTransaction(key);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( options === null || typeof options !== 'object' ){
            options = {create: false, silent: false};
        }
        const path = this.getPath() + components.namespace + '/' + components.key + '.cache';
        // Check if the file exists and then fetch its contents.
        const data = await FileCacheDriver._readFile(path, true);
        if ( data === null ){
            if ( options.create === true ){
                // The given item doesn't exist, it must be created on-the-fly using the increment value as the "create" option has been set to "true".
                const serialization = serialize(value);
                const contents = serialization.dataTypeCode.toString() + ':' + serialization.value;
                await FileCacheDriver._writeFile(path, contents, true);
            }else if ( options.silent !== true ){
                throw new InvalidArgumentException('Undefined key.', 2);
            }
            return;
        }
        const dataTypeCode = parseInt(data.charAt(0));
        if ( dataTypeCode !== 5 && dataTypeCode !== 8 ){
            // The item is not a numeric value.
            if ( options.silent !== true ){
                throw new InvalidArgumentException('The given item is not a numeric value.', 3);
            }
            return;
        }
        // If the serialized data is a numeric value, increment it.
        const original = unserialize(data.substr(2), dataTypeCode);
        // If the original value is a BigInt, the increment must be converted into a BigInt as well.
        const newValue = dataTypeCode === 8 ? ( original + BigInt(value) ) : ( original + value );
        const serialization = serialize(newValue);
        const contents = serialization.dataTypeCode.toString() + ':' + serialization.value;
        // Save the incremented value.
        await FileCacheDriver._writeFile(path, contents, true);
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {string} key A string representing the element's key.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.create If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean?} options.silent If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If the given key is not valid.
     * @throws InvalidArgumentException If the given key was not found.
     * @throws InvalidArgumentException If the given item is not a numeric value.
     * @throws RuntimeException If an error occurs while reading the file.
     * @throws RuntimeException If an error occurs while writing the file.
     *
     * @async
     */
    async decrement(key, value, options){
        const increment = value === null || isNaN(value) ? -1 : -value;
        await this.increment(key, increment, options);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {object} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.overwrite If set to "true" and if an item already exists, it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid object containing the items to store is given.
     * @throws DuplicateEntryException If one of the given keys were found and the "overwrite" option wasn't set to "true".
     * @throws RuntimeException If an error occurs while writing one or more files.
     *
     * @async
     */
    async setMulti(items, options){
        if ( items === null || typeof items !== 'object' ){
            throw new InvalidArgumentException('Invalid items object.', 1);
        }
        const keys = Object.keys(items);
        const components = this._prepareMultipleTransaction(keys);
        const path = this.getPath() + components.namespace + '/';
        if ( options === null || typeof options !== 'object' ){
            options = {overwrite: false};
        }
        options.overwrite = typeof options.overwrite === 'boolean' ? options.overwrite : this.getOverwrite();
        let processes = [];
        const length = components.keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Generate a new file for each item.
            const item = path + components.keys[i] + '.cache';
            const serialization = serialize(items[keys[i]]);
            const contents = serialization.dataTypeCode.toString() + ':' + serialization.value;
            // Write the content to the file.
            processes.push(FileCacheDriver._writeFile(item, contents, options.overwrite));
        }
        await Promise.all(processes);
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.silent If set to "true" and if the given item doesn't exist an exception will be thrown, otherwise, null will be returned instead.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     * @throws InvalidArgumentException If one of the given key was not found.
     * @throws RuntimeException If an error occurs while reading one or more files.
     *
     * @async
     */
    async getMulti(keys, options){
        const components = this._prepareMultipleTransaction(keys);
        const path = this.getPath() + components.namespace + '/';
        if ( options === null || typeof options !== 'object' ){
            options = {silent: false};
        }
        const silent = options.silent === true;
        let processes = [];
        let references = {};
        let length = components.keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Build an object having as key the key hash and as value the corresponding original key.
            references[components.keys[i]] = keys[i];
            // Read the contents of each file corresponding to the given items.
            processes.push(FileCacheDriver._readFile(path + components.keys[i] + '.cache', silent));
        }
        processes = await Promise.all(processes);
        let items = {};
        length = processes.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( processes[i] === null ){
                items[keys[i]] = null;
                continue;
            }
            const dataTypeCode = parseInt(processes[i].charAt(0));
            // Convert the loaded data from the JSON serialization into the original data.
            items[keys[i]] = unserialize(processes[i].substr(2), dataTypeCode);
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
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     *
     * @async
     */
    async existsMulti(keys, all = false, options){
        const components = this._prepareMultipleTransaction(keys);
        const path = this.getPath() + components.namespace + '/';
        if ( all === true ){
            const length = keys.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( filesystem.existsSync(path + keys[i] + '.cache') !== true ){
                    return false;
                }
            }
            return true;
        }
        let items = {};
        const length = components.keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            items[keys[i]] = filesystem.existsSync(path + components.keys[i] + '.cache') === true;
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
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     * @throws RuntimeException If an error occurs while removing one or more files.
     *
     * @async
     */
    async removeMulti(keys, options){
        const components = this._prepareMultipleTransaction(keys);
        const path = this.getPath() + components.namespace + '/';
        let processes = [];
        const length = components.keys.length;
        for ( let i = 0  ; i < length ; i++ ){
            processes.push(new Promise((resolve, reject) => {
                filesystem.unlink(path + components.keys[i] + '.cache', (error) => {
                    if ( error !== null && error.code !== 'ENOENT' ){
                        return reject(new RuntimeException('An error occurred while removing the item.', 3, error));
                    }
                    resolve();
                });
            }));
        }
        await Promise.all(processes);
    }

    /**
     * Increments the value of multiple elements by a given delta.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is 1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.create If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean?} options.silent If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     * @throws InvalidArgumentException If one of the given key was not found.
     * @throws InvalidArgumentException If one of the given item is not a numeric value.
     * @throws RuntimeException If an error occurs while reading one or more files.
     * @throws RuntimeException If an error occurs while writing one or more files.
     *
     * @async
     */
    async incrementMulti(keys, value, options){
        const components = this._prepareMultipleTransaction(keys);
        value = value === null || isNaN(value) ? 1 : value;
        if ( value === 0 ){
            return;
        }
        if ( options === null || typeof options !== 'object' ){
            options = {create: false, silent: false};
        }
        const path = this.getPath() + components.namespace + '/';
        let processes = [];
        const length = components.keys.length;
        for ( let i = 0 ; i < length ; i++ ){
            processes.push(new Promise((resolve, reject) => {
                const location = path + components.keys[i] + '.cache';
                FileCacheDriver._readFile(location, true).then((data) => {
                    if ( data === null ){
                        if ( options.create === true ){
                            // The element doesn't exist and must be created using the increment value.
                            const serialization = serialize(value);
                            const contents = serialization.dataTypeCode.toString() + ':' + serialization.value;
                            FileCacheDriver._writeFile(location, contents, true).then(() => {
                                resolve();
                            }).catch((ex) => {
                                reject(ex);
                            });
                        }else if ( options.silent !== true ){
                            return reject(new InvalidArgumentException('Undefined key.', 2));
                        }
                        return resolve();
                    }
                    const dataTypeCode = parseInt(data.charAt(0));
                    if ( dataTypeCode !== 5 && dataTypeCode !== 8 ){
                        // The item is not a numeric value.
                        if ( options.silent !== true ){
                            return reject(new InvalidArgumentException('The given item is not a numeric value.', 3));
                        }
                        return resolve();
                    }
                    const original = unserialize(data.substr(2), dataTypeCode);
                    // If the original value is a BigInt, the increment must be converted into a BigInt as well.
                    const newValue = dataTypeCode === 8 ? ( original + BigInt(value) ) : ( original + value );
                    const serialization = serialize(newValue);
                    const contents = serialization.dataTypeCode.toString() + ':' + serialization.value;
                    FileCacheDriver._writeFile(location, contents, true).then(() => {
                        resolve();
                    }).catch((ex) => {
                        reject(ex);
                    });
                }).catch((ex) => {
                    reject(ex);
                });
            }));
        }
        await Promise.all(processes);
    }

    /**
     * Decrements the value of a given key by a given delta.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {number|null} value A floating point number representing the increment delta (positive or negative), the default value is -1.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @param {boolean?} options.create If set to "true" and if the element doesn't exist it will be created applying the increment to zero.
     * @param {boolean?} options.silent If set to "true" and if the element doesn't exist or it isn't a number it will be ignored, otherwise an exception will be thrown.
     *
     * @returns {Promise<void>}
     *
     * @throws MisconfigurationException If no storage directory has been defined.
     * @throws InvalidArgumentException If an invalid array containing the keys is given.
     * @throws InvalidArgumentException If one of the given key was not found.
     * @throws InvalidArgumentException If one of the given item is not a numeric value.
     * @throws RuntimeException If an error occurs while reading one or more files.
     * @throws RuntimeException If an error occurs while writing one or more files.
     *
     * @async
     */
    async decrementMulti(keys, value, options){
        const increment = value === null || isNaN(value) ? -1 : -value;
        await this.incrementMulti(keys, increment, options);
    }

    /**
     * Does nothing, just avoid warning as this method wasn't overridden after extending the "CacheDriver" class.
     *
     * @returns {Promise<void>}
     */
    async init() {}
}

module.exports = FileCacheDriver;