'use strict';

// Including native modules.
const crypto = require('crypto');

// Including Lala's modules.
const CacheTemplateRepository = require('./CacheTemplateRepository');
const CacheDriverRepository = require('./CacheDriverRepository');
const ConnectionRepository = require('../Database/ConnectionRepository');
const ConnectionFactoryHelper = require('../Database/ConnectionFactoryHelper');
const Connection = require('../Database/connections/Connection');
const ClusteredConnection = require('../Database/connections/ClusteredConnection');
const Logger = require('../Logger/Logger');
const {
    InvalidArgumentException,
    DriverNotDefinedException
} = require('../Exceptions');

class CacheTemplate {
    /**
     * Generates an instance of this class representing a configuration template and built by using information from a given configuration block.
     *
     * @param {object} block An object representing the configuration block to process.
     *
     * @returns {Promise<CacheTemplate>} An instance of this class representing the generated configuration template.
     *
     * @throws InvalidArgumentException If an invalid object representing the configuration block is given.
     * @throws DriverNotDefinedException If a driver has been specified but is has not been registered yet.
     * @throws InvalidArgumentException If the given connection has not been registered yet.
     *
     * @async
     */
    static async createFromConfigBlock(block){
        if ( block === null || typeof block !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        let template = new CacheTemplate();
        const driver = block.driver !== '' && typeof block.driver === 'string' ? block.driver : null;
        if ( driver !== null ){
            template.setDriver(block.driver);
        }
        if ( driver !== null && block.connection !== null ){
            if ( typeof block.connection === 'string' ){
                try{
                    // Set the name of the connection to use, if it doesn't exist, connection will be set to null and default connection for this driver will be used instead.
                     template.setConnection(block.connection);
                }catch(ex){
                    Logger.log('[CacheTemplate]: The connection defined ("' + block.connection + '", driver "' + driver + '") does not exist.');
                }
            }else if ( block.connection !== null && typeof block.connection === 'object' ){
                try{
                    // Generate the connection object according to the driver declared.
                    const connection = await ConnectionFactoryHelper.createFromConfigBlock(driver, block.connection);
                    template.setConnectionObject(connection);
                }catch(ex){
                    Logger.log('[CacheTemplate]: The connection object defined appears to be invalid.');
                }
            }
        }
        if ( block.options !== null && typeof block.options === 'object' ){
            // Set the custom option defined for this configuration template.
            template.setOptions(block.options);
        }
        if ( !isNaN(block.ttl) && block.ttl > 0 ){
            template.setTTL(block.ttl);
        }
        if ( block.namespace !== '' && typeof block.namespace === 'string' ){
            template.setNamespace(block.namespace);
        }
        const overwrite = block.overwrite === true;
        template.setOverwrite(overwrite);
        if ( block.hashingAlgorithm !== '' && typeof block.hashingAlgorithm === 'string' && CacheTemplate.isSupportedHashingAlgorithm(block.hashingAlgorithm) ){
            template.setHashingAlgorithm(block.hashingAlgorithm);
        }
        if ( block.path !== '' && typeof block.path === 'string' ){
            template.setPath(block.path);
        }
        return template;
    }

    /**
     * Checks if the given hashing algorithm is supported by the built-in crypto module.
     *
     * @param {string} algorithm A string representing the algorithm name.
     *
     * @returns {boolean} If the given algorithm is supported will be returned "true", otherwise "false".
     */
    static isSupportedHashingAlgorithm(algorithm){
        return crypto.getHashes().indexOf(algorithm) !== -1;
    }

    /**
     * The class constructor.
     *
     * @param {string} driver A string representing the name of the driver to use, this driver must have been registered before calling this method, by default, "local" is used.
     * @param {string|null} connection A string representing the connection name, note that the connection must have been registered first.
     *
     * @throws DriverNotDefinedException If a driver has been specified but is has not been registered yet.
     */
    constructor(driver = 'local', connection = null){
        this._driver = 'local';
        this._connection = null;
        this._connectionName = null;
        this._options = null;
        this._ttl = null;
        this._namespace = null;
        this._overwrite = false;
        this._hashingAlgorithm = null;
        this._path = null;
        if ( driver !== '' && typeof driver === 'string' ){
            this.setDriver(driver);
        }
        if ( connection !== '' && typeof connection === 'string' ){
            this.setConnection(connection);
        }
    }

    /**
     * Sets the driver to use, this method is chainable.
     *
     * @param {string} driver A string representing the name of the driver to use, note that it must have been registered first.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If the given driver name is not valid.
     * @throws DriverNotDefinedException If the given driver has not been registered yet.
     */
    setDriver(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        // Check if the given driver has been registered.
        if ( !CacheDriverRepository.has(driver) ){
            throw new DriverNotDefinedException('The given driver was not registered.', 2);
        }
        this._driver = driver;
        return this;
    }

    /**
     * Returns the name of the driver that has been defined.
     *
     * @returns {string} A string representing the name of the driver name.
     */
    getDriver(){
        return this._driver;
    }

    /**
     * Sets the connection to use based on the name of a registered connection, this method is chainable.
     *
     * @param {string|null} connection A string representing the connection name, note that the connection must have been registered first, if set to null, the default connection will be used instead.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If an invalid connection name is given.
     * @throws InvalidArgumentException If the given connection has not been registered yet.
     */
    setConnection(connection){
        if ( connection === null ){
            this._connection = this._connectionName = null;
            return this;
        }
        if ( connection === '' || typeof connection !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        // Check if the given connection has been registered.
        if ( !ConnectionRepository.has(this._driver, connection) ){
            throw new InvalidArgumentException('Undefined connection.', 2);
        }
        // Get the connection object matching the given name.
        this._connection = ConnectionRepository.get(this._driver, connection);
        this._connectionName = connection;
        return this;
    }

    /**
     * Sets the connection to use, this method is chainable.
     *
     * @param {object} connection An object representing the connection, it must extends "Connection" or "ClusteredConnection", if set to null, the default connection will be used instead.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If an invalid class instance is given.
     * @throws InvalidArgumentException If the given class does not extend "Connection" or "ClusteredConnection".
     */
    setConnectionObject(connection){
        if ( connection === null ){
            this._connection = this._connectionName = null;
            return this;
        }
        if ( typeof connection !== 'object' ){
            throw new InvalidArgumentException('Invalid connection object.', 1);
        }
        const parent = Object.getPrototypeOf(connection.constructor);
        if ( parent !== Connection && parent !== ClusteredConnection ){
            throw new InvalidArgumentException('The given class does not meet the inheritance requirements.', 2);
        }
        this._connection = connection;
        this._connectionName = null;
        return this;
    }

    /**
     * Returns the connection to use.
     *
     * @returns {object|null} An object representing the connection, if the default connection is going to be used, null will be returned instead.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Returns the name of the connection that has been defined.
     *
     * @returns {string|null} A string representing the connection name, if no connection name is available null will be returned instead, for example, if a connection has been defined as object or no connection has been defined.
     */
    getConnectionName(){
        return this._connectionName;
    }

    /**
     * Sets the additional custom options to consider when using this configuration template, this method is chainable.
     *
     * @param {object|null} options An object representing the options, if set to null, no option will be considered.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If the given object is not valid.
     */
    setOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options object.', 1);
        }
        this._options = options;
        return this;
    }

    /**
     * Returns the additional custom options defined that will be considered whenever using this configuration template.
     *
     * @returns {object|null} An object representing the options, if no custom option has been defined, null will be returned instead.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Sets the TTL to use by default, this method is chainable.
     *
     * @param {number|null} ttl An integer number greater than zero representing the TTL to use by default in seconds, if set to null, no TTL will be applied by default.
     *
     * @returns {CacheTemplate}
     */
    setTTL(ttl){
        this._ttl = ttl === null || isNaN(ttl) || ttl <= 0 ? null : ttl;
        return this;
    }

    /**
     * Returns the TTL to use by default.
     *
     * @returns {number|null} An integer number greater than zero representing the TTL that is going to be used by default, if no TTL will be used, null will be returned instead.
     */
    getTTL(){
        return this._ttl;
    }

    /**
     * Sets the namespace that will identify the stored items, this method is chainable.
     *
     * @param {string|null} namespace A string representing the namespace, if set to null or empty string, no namespace will be applied to the entries.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If an invalid namespace is given.
     */
    setNamespace(namespace){
        if ( namespace === null || namespace === '' ){
            this._namespace = null;
            return this;
        }
        if ( typeof namespace !== 'string' ){
            throw new InvalidArgumentException('Invalid namespace.', 1);
        }
        this._namespace = namespace;
        return this;
    }

    /**
     * Returns the namespace that will identify the stored items.
     *
     * @returns {string|null} A string representing the namespace, if no namespace has been defined, null will be returned instead.
     */
    getNamespace(){
        return this._namespace;
    }

    /**
     * Sets if older items can be overwritten by newer ones, this method is chainable.
     *
     * @param {boolean} overwrite If set to "true" older items will be overwritten by newer ones whenever a key conflict occurs, otherwise an exception will be thrown.
     *
     * @returns {CacheTemplate}
     */
    setOverwrite(overwrite){
        this._overwrite = overwrite === true;
        return this;
    }

    /**
     * Returns if older items can be overwritten by newer ones.
     *
     * @returns {boolean} If older items can be overwritten will be returned "true", otherwise "false".
     */
    getOverwrite(){
        return this._overwrite;
    }

    /**
     * Sets the algorithm that the cache engine should use to generate the key hashes, this method is chainable.
     *
     * @param {string|null} algorithm A string containing the name of the hashing algorithm, if set to null, the default algorithm will be used instead according to global settings.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If an invalid algorithm name has been given.
     * @throws InvalidArgumentException If an unsupported algorithm has been given.
     */
    setHashingAlgorithm(algorithm){
        if ( algorithm === null ){
            this._hashingAlgorithm = null;
            return this;
        }
        if ( algorithm === '' || typeof algorithm !== 'string' ){
            throw new InvalidArgumentException('Invalid algorithm name.', 1);
        }
        if ( !CacheTemplate.isSupportedHashingAlgorithm(algorithm) ){
            throw new InvalidArgumentException('Unsupported algorithm.', 2);
        }
        this._hashingAlgorithm = algorithm;
        return this;
    }

    /**
     * Returns the algorithm that the cache engine will use to generate the key hashes.
     *
     * @returns {string|null} A string containing the name of the hashing algorithm, if no custom algorithm has been defined, null will be returned instead.
     */
    getHashingAlgorithm(){
        return this._hashingAlgorithm;
    }

    /**
     * Sets the path where cached items should be stored if the driver supports file storage, this method is chainable.
     *
     * @param {string|null} path A string containing the path where the cache should be stored at, if set to null, default configuration will be used instead.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If the given path is invalid.
     */
    setPath(path){
        if ( path === null ){
            this._path = null;
            return this;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._path = path;
        return this;
    }

    /**
     * Returns the path where cached items will be stored if the driver supports file storage.
     *
     * @returns {string|null} A string containing the path where the cache should be stored, if no custom path has been defined, null will be returned instead.
     */
    getPath(){
        return this._path;
    }

    /**
     * Generates an instance of the class "Cache" using as configuration parameters the properties of this class.
     *
     * @return {Cache} An instance of the class "Cache" configured according to this class properties.
     */
    buildCacheObject(){
        const Cache = require('./Cache');
        let cache = new Cache();
        this.injectConfiguration(cache);
        return cache;
    }

    /**
     * Registers the configuration template making it available globally, this method is chainable.
     *
     * @param {string} name A string containing the name that identifies this template, it must be unique.
     * @param {boolean} overwrite If set to "true" and if another template has been registered with the same name, it will be overwritten, otherwise, an exception will be thrown.
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If an invalid name is given.
     * @throws InvalidArgumentException If another template with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    register(name, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid name.', 1);
        }
        CacheTemplateRepository.register(name, this, overwrite);
        return this;
    }

    /**
     * Injects the properties that have been defined into a given instance of the class "Cache", this method is chainable.
     *
     * @param {Cache} instance An instance of the class "Cache".
     *
     * @returns {CacheTemplate}
     *
     * @throws InvalidArgumentException If an invalid class instance is given.
     */
    injectConfiguration(instance){
        // Use the constructor name instead of the "instanceof" operator to avoid requiring the "Cache" class, it cannot be required globally due to a circular dependency issue.
        if ( instance === null || typeof instance !== 'object' || instance.constructor.name !== 'Cache' ){
            throw new InvalidArgumentException('Invalid class instance.', 1);
        }
        // Basic configurations.
        instance.setHashingAlgorithm(this._hashingAlgorithm).setTTL(this._ttl).setNamespace(this._namespace).setOverwrite(this._overwrite);
        // Driver configuration.
        instance.setDriverOptions(this._options).setDriver(this._driver);
        if ( instance.connectionSupported() ){
            instance.setConnection(this._connection);
        }
        if ( instance.pathSupported() ){
            instance.setPath(this._path);
        }
        return this;
    }
}

module.exports = CacheTemplate;