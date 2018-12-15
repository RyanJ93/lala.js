'use strict';

// Including native modules.
const { EventEmitter } = require('events');
const crypto = require('crypto');

// Including Lala's modules.
const Config = require('../Config/Config');
const Logger = require('../Logger/Logger');
const LocalCacheDriver = require('./drivers/LocalCacheDriver');
const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');
const DriverNotDefinedException = require('../Exceptions/DriverNotDefinedException');
const BadMethodCallException = require('../Exceptions/BadMethodCallException');
const UnsupportedMethodException = require('../Exceptions/UnsupportedMethodException');

/**
 * @type {object<string, function>} _providers An object containing all the supported providers stored as key/value pairs where the key is a string representing the provider name and the value is the handler class.
 *
 * @private
 */
let _providers = {
    local: LocalCacheDriver
};

/**
 * @type {object} _connections An object that contains the registered connection, each connection is grouped according to its driver name.
 *
 * @private
 */
let _connections = {};

/**
 * @type {string} _defaultDriver A string containing the name of the default driver to use, driver must be registered when defined.
 *
 * @private
 */
let _defaultDriver = 'local';

/**
 * @type {string} _defaultConnection A string containing the name of the default connection to use, the connection must have been registered before using it.
 *
 * @private
 */
let _defaultConnection = 'default';

/**
 * @type {string|null} _defaultPath A string containing the path where the driver should store cache data in, this will be considered only if the driver in use supports file storage.
 *
 * @private
 */
let _defaultPath = null;

/**
 * @type {string} _defaultHashingAlgorithm A string containing the name of the hashing algorithm to use by default when generating the items keys.
 *
 * @private
 */
let _defaultHashingAlgorithm = 'md5';

class Cache extends EventEmitter {
    /**
     * Initializes the cache according with the settings defined in the configuration file.
     *
     * @static
     */
    static initFromConfig(){
        let cache = Config.getProperty('cache');
        if ( cache === null ){
            return;
        }
        let driver = cache.driver !== '' && typeof cache.driver === 'string' ? cache.driver : 'local';
        try{
            // Try to set the defined cache driver as default driver.
            Cache.setDefaultDriver(driver);
        }catch(ex){
            Logger.log('Unsupported cache driver: ' + driver + ' falling back to local cache driver.');
            // If the defined driver is not supported, then fallback to the local driver.
            Cache.setDefaultDriver('local');
        }
        // Sets the name of the connection to use by default.
        let connection = cache.connectionName !== '' && typeof cache.connectionName === 'string' ? cache.connectionName : null;
        Cache.setDefaultConnection(connection);

    }

    /**
     * Registers a new class as cache driver.
     *
     * @param {string} name A string representing the driver name.
     * @param {function} handler A function representing the provider class to use.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If an invalid handler function is given.
     *
     * @static
     */
    static async registerDriver(name, handler){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid provider name.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler class.', 2);
        }
        if ( typeof handler.init === 'function' ){
            handler.init();
        }
        // Call the setup method, if found, to allow the driver to set up connections and variables.
        if ( typeof handler.setup === 'function' ){
            // If set up function returns "false" it means that the driver cannot be used.
            if ( await handler.setup() === false ){
                return;
            }
        }
        // Register the given provider making it available globally.
        _providers[name] = handler;
    }

    /**
     * Removes a driver from the list of all the registered drivers.
     *
     * @param {string} name A string representing the driver name.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     *
     * @static
     */
    static unregisterDriver(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid provider name.', 1);
        }
        if ( _providers.hasOwnProperty(name) ){
            delete _providers[name];
        }
        if ( _connections.hasOwnProperty(name) ){
            delete _connections[name];
        }
    }

    /**
     * Returns a list of all the drivers that have been registered and that are available to be used to cache data.
     *
     * @returns {string[]} A sequential array of strings containing the drivers' names.
     *
     * @static
     */
    static getRegisteredDrivers(){
        return Object.keys(_providers);
    }

    /**
     * Checks if a given driver name is registered and available to be used.
     *
     * @param {string} driver A string representing the driver name.
     *
     * @returns {boolean} If the given provider is supported will be returned "true", otherwise "false".
     *
     * @static
     */
    static isSupportedDriver(driver){
        return driver !== '' && typeof driver === 'string' && Object.keys(_providers).indexOf(driver) !== -1;
    }

    /**
     * Adds a connection to the list off all the available connections for this driver, this list is used by the drivers that require a connection to an external _storage engine.
     *
     * @param {string} driver A string representing the driver name.
     * @param {string} name A string representing the connection identifier, it must be unique.
     * @param {object} connection An object representing the instance of the connection.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If the given driver has not been registered.
     * @throws InvalidArgumentException If an invalid connection name is given.
     * @throws InvalidArgumentException If an invalid connection handler class is given.
     *
     * @static
     */
    static addConnection(driver, name, connection){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !Cache.isSupportedDriver(driver) ){
            throw new InvalidArgumentException('Unsupported driver.', 2);
        }
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 3);
        }
        if ( connection === null || typeof connection !== 'object' ){
            throw new InvalidArgumentException('Invalid connection handler class.', 4);
        }
        if ( _connections[driver] === null || typeof _connections[driver] !== 'object' ){
            _connections[driver] = {};
        }
        _connections[driver][name] = connection;
    }

    /**
     * Returns a connection matching a given name.
     *
     * @param {string} driver A string representing the driver name.
     * @param {string|null} name A string representing the connection identifier, if set to null, the default connection will be returned.
     *
     * @returns {object\|null} The object representing the instance of the connection, if no connection is found, null will be returned.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If the given driver has not been registered.
     * @throws InvalidArgumentException If an invalid connection name is given.
     *
     * @static
     */
    static getConnection(driver, name = null){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !Cache.isSupportedDriver(driver) ){
            throw new InvalidArgumentException('Unsupported driver.', 2);
        }
        if ( _connections[driver] === null || typeof _connections[driver] !== 'object' ){
            // If the driver group doesn't exist, surely the given connection won't exist.
            return null;
        }
        if ( name === null ){
            if ( _connections[driver].hasOwnProperty('default') ){
                return _connections[driver].default;
            }
            let connection = Object.values(_connections[driver])[0];
            return typeof connection === 'undefined' ? null : connection;
        }
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        return _connections[driver].hasOwnProperty(name) ? _connections[driver][name] : null;
    }

    /**
     * Checks if a connection exists based on the given connection name.
     *
     * @param {string} driver A string representing the driver name.
     * @param {string} name A string representing the connection identifier.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If an invalid connection name is given.
     *
     * @static
     */
    static hasConnection(driver, name){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        return _connections[driver].hasOwnProperty(name) && _connections[driver][name] !== null && typeof _connections[driver][name] === 'object';
    }

    /**
     * Removes a connection from the list of all the available connections for this driver.
     *
     * @param {string} driver A string representing the driver name.
     * @param {string} name A string representing the connection identifier.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If an invalid connection name is given.
     *
     * @static
     */
    static removeConnection(driver, name){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( _connections[driver].hasOwnProperty(name) ){
            delete _connections[driver][name];
        }
    }

    /**
     * Removes all the registered connections for a given driver.
     *
     * @param {string} driver A string representing the driver name.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     *
     * @static
     */
    static removeDriverConnections(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( _connections.hasOwnProperty(driver) ){
            delete _connections[driver];
        }
    }

    /**
     * Sets the default driver to use whenever no driver is specified.
     *
     * @param {string} driver A string representing the driver name, the driver must have been registered first.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If the given driver has not been registered.
     *
     * @static
     */
    static setDefaultDriver(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !Cache.isSupportedDriver(driver) ){
            throw new InvalidArgumentException('This driver has not been registered.', 2);
        }
        _defaultDriver = driver;
    }

    /**
     * Returns the default driver to use whenever no driver is specified.
     *
     * @return {string} A string representing the driver name.
     */
    static getDefaultDriver(){
        return _defaultDriver;
    }

    /**
     * Sets the default connection to use.
     *
     * @param {string|null} connection A string containing the connection name, if set to null, the default connection offered by current driver will be used instead.
     *
     * @throws InvalidArgumentException If an invalid connection name is given.
     *
     * @static
     */
    static setDefaultConnection(connection){
        if ( connection === null ){
            _defaultConnection = null;
            return;
        }
        if ( connection === '' || typeof connection !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        _defaultConnection = connection;
    }

    /**
     * Returns the default connection to use.
     *
     * @return {string|null} A string containing the connection name, if connection will be chosen according to driver's default will be returned null.
     *
     * @static
     */
    static getDefaultConnection(){
        return _defaultConnection;
    }

    /**
     * Sets the default path to use whenever a driver requires a path to store cached data.
     *
     * @param {string} path A string representing the path.
     *
     * @throws InvalidArgumentException If an invalid path is given.
     *
     * @static
     */
    static setDefaultPath(path){
        if ( path === null ){
            _defaultPath = nulL;
            return;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path', 1);
        }
        _defaultPath = path;
    }

    /**
     * Returns the default path that will be used whenever a driver requires a path to store cached data
     *
     * @returns {string|null} A string representing the path, if no default path has been defined, null will be returned instead.
     *
     * @static
     */
    static getDefaultPath(){
        return _defaultPath;
    }

    /**
     * Sets the default hashing algorithm that the cache driver should use to generate the item keys' hashes.
     *
     * @param {string} algorithm A string containing the name of the hashing algorithm, if set to null, "md5" will be used instead.
     *
     * @throws InvalidArgumentException If an invalid algorithm name has been given.
     * @throws InvalidArgumentException If an unsupported algorithm has been given.
     */
    static setDefaultHashingAlgorithm(algorithm){
        if ( algorithm === null || algorithm === 'md5' ){
            _defaultHashingAlgorithm = 'md5';
            return;
        }
        if ( algorithm === '' || typeof algorithm !== 'string' ){
            throw new InvalidArgumentException('Invalid algorithm name.', 1);
        }
        // Check if the given hashing algorithm is supported.
        if ( crypto.getHashes().indexOf(algorithm) === -1 ){
            throw new InvalidArgumentException('Unsupported algorithm.', 2);
        }
        _defaultHashingAlgorithm = algorithm;
    }

    /**
     * Returns the default hashing algorithm that the cache driver should use to generate the item keys' hashes.
     *
     * @returns {string} A string containing the name of the hashing algorithm, if no custom algorithm has been defined, "md5" will be used as default one.
     */
    static getDefaultHashingAlgorithm(){
        return _defaultHashingAlgorithm;
    }

    /**
     * The class constructor.
     *
     * @param {string|null?} driver A string representing the driver name, if not set, the default driver will be used instead.
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     */
    constructor(driver = null){
        super();
        this._driver = '';
        this._driverInstance = null;
        this._driverOptions = null;
        this._hashingAlgorithm = _defaultHashingAlgorithm;
        if ( driver === null ){
            this.setDriver(_defaultDriver);
        }else{
            if ( driver === '' || typeof driver !== 'string' ){
                throw new InvalidArgumentException('Invalid driver name.', 1);
            }
            this.setDriver(driver);
        }
    }

    /**
     * Checks if the driver that has been configured supports connections through "setConnection" and "getConnection" method.
     *
     * @returns {boolean} If the configured driver support connections will be returned "true", otherwise "false".
     */
    connectionSupported(){
        return this._driverInstance !== null && typeof this._driverInstance.setConnection === 'function' && typeof this._driverInstance.getConnection === 'function';
    }

    /**
     * Sets the connection that the the driver that has been configured should use to connect to the _storage engine, this method is chainable.
     *
     * @param {string|object|null} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @returns {Cache}
     *
     * @throws BadMethodCallException If no driver has been configured.
     * @throws UnsupportedMethodException If the configured driver does not support connections.
     */
    setConnection(connection){
        if ( this._driverInstance === null ){
            throw new BadMethodCallException('No driver has been configured.', 1);
        }
        if ( !this.connectionSupported() ){
            throw new UnsupportedMethodException('The configured driver does not support connections.', 2);
        }
        this._driverInstance.setConnection(connection);
        return this;
    }

    /**
     * Sets the connection that the the driver that has been configured is going to use to connect to the _storage engine.
     *
     * @returns {object|null} An object representing the connection, if no connection has been defined, null will be returned instead.
     *
     * @throws BadMethodCallException If no driver has been configured.
     * @throws UnsupportedMethodException If the configured driver does not support connections.
     */
    getConnection(){
        if ( this._driverInstance === null ){
            throw new BadMethodCallException('No driver has been configured.', 1);
        }
        if ( !this.connectionSupported() ){
            throw new UnsupportedMethodException('The configured driver does not support connections.', 2);
        }
        return this._driverInstance.getConnection();
    }

    /**
     * Checks if the driver that has been configured supports paths to configure file _storage using "setPath" and "getPath" method.
     *
     * @returns {boolean} If the configured driver support paths will be returned "true", otherwise "false".
     */
    pathSupported(){
        return this._driverInstance !== null && typeof this._driverInstance.setPath === 'function' && this._driverInstance.getPath === 'function';
    }

    /**
     * Sets the path the driver that has been configured should use, this method is chainable.
     *
     * @param {string} path A string representing the path to the file or the directory.
     *
     * @returns {Cache}
     *
     * @throws BadMethodCallException If no driver has been configured yet.
     * @throws UnsupportedMethodException If the configured driver does not support file _storage.
     */
    setPath(path){
        if ( this._driverInstance === null ){
            throw new BadMethodCallException('No driver has been configured.', 1);
        }
        if ( !this.pathSupported() ){
            throw new UnsupportedMethodException('The configured driver does not support paths.', 2);
        }
        this._driverInstance.setPath(path);
        return this;
    }

    /**
     * Returns the path the driver that has been configured is going to use.
     *
     * @returns {string|null} A string representing the path to the file or the directory, if no path has been defined, null will be returned instead.
     *
     * @throws BadMethodCallException If no driver has been configured yet.
     * @throws UnsupportedMethodException If the configured driver does not support file _storage.
     */
    getPath(){
        if ( this._driverInstance === null ){
            throw new BadMethodCallException('No driver has been configured.', 1);
        }
        if ( !this.pathSupported() ){
            throw new UnsupportedMethodException('The configured driver does not support paths.', 2);
        }
        return this._driverInstance.getPath();
    }

    /**
     * Sets the namespace that will be used to group cached entries, this method is chainable.
     *
     * @param {string} namespace A string representing the namespace.
     *
     * @returns {Cache}
     *
     * @throws InvalidArgumentException If an invalid namespace were given.
     */
    setNamespace(namespace){
        this._driverInstance.setNamespace(namespace);
        return this;
    }

    /**
     * Returns the namespace that will be used to group cached entries.
     *
     * @returns {string|null} A string representing the namespace, if no namespace has been defined, null will be returned instead.
     */
    getNamespace(){
        return this._driverInstance.getNamespace();
    }

    /**
     * Sets if an older entry can be replaced by a newer one, if not, an exception will be thrown at write time, this method is chainable.
     *
     * @param overwrite If set to "true" entry overwrite will be allowed, otherwise not.
     *
     * @returns {Cache}
     */
    setOverwrite(overwrite){
        this._driverInstance.setOverwrite(overwrite);
        return this;
    }

    /**
     * Returns if an older entry can be replaced by a newer one or not.
     *
     * @returns {boolean} If entry overwrite is allowed will be returned "true", otherwise "false".
     */
    getOverwrite(){
        return this._driverInstance.getOverwrite();
    }

    /**
     * Checks if the driver is ready to be used or not.
     *
     * @returns {boolean} If the cache driver is ready will be returned "true", otherwise "false".
     */
    isReady(){
        return this._driverInstance.isReady();
    }

    /**
     * Sets the default expiration time for entries, this method is chainable.
     *
     * @param {number} ttl An integer number greater than zero representing the expiration time in seconds, if zero is given, no TTL will be used.
     *
     * @returns {Cache}
     */
    setDefaultTTL(ttl){
        this._driverInstance.setDefaultTTL(ttl);
        return this;
    }

    /**
     * Returns the default expiration time for entries.
     *
     * @returns {number|null} An integer number greater than zero representing the expiration time in seconds, if no TTL is going to be used, null will be returned instead.
     */
    getDefaultTTL(){
        return this._driverInstance.getDefaultTTL();
    }

    /**
     * Sets some additional options that will be passed to the driver instance, this method is chainable.
     *
     * @param {object<string, any>} options An object containing the custom options that the driver should consider.
     */
    setDriverOptions(options){
        this._driverOptions = typeof options !== 'object' ? null : options;
        if ( this._driverInstance !== null ){
            this._driverInstance.setOptions(options);
        }
        return this;
    }

    /**
     * Returns the additional options for the driver instance that have been defined.
     *
     * @returns {object<string, any>} options An object containing the custom options that the driver should consider.
     */
    getDriverOptions(){
        return this._driverOptions;
    }

    /**
     * Sets the driver to use to cache data, this method is chainable.
     *
     * @param {string} driver A string representing the driver name.
     *
     * @returns {Cache}
     *
     * @throws InvalidArgumentException If an invalid driver name is given.
     * @throws InvalidArgumentException If the given driver is not supported or has not been registered yet.
     */
    async setDriver(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !_providers.hasOwnProperty(driver) || typeof _providers[driver] !== 'function' ){
            throw new InvalidArgumentException('Unsupported driver.', 2);
        }
        this._driverInstance = null;
        this._driver = driver;
        this._driverInstance = new _providers[driver]();
        if ( _defaultConnection !== null && this.connectionSupported() ){
            this._driverInstance.setConnection(_defaultConnection);
        }
        if ( _defaultPath !== null && this.pathSupported() ){
            this._driverInstance.setPath(_defaultPath);
        }
        if ( this._driverOptions !== null ){
            this._driverInstance.setOptions(this._driverOptions);
        }
        this._driverInstance.setHashingAlgorithm(this.getHashingAlgorithm());
        await this._driverInstance.init();
        return this;
    }

    /**
     * Returns the name of the driver to use to cache data.
     *
     * @returns A string representing the driver name.
     */
    getDriver(){
        return this._driver;
    }

    /**
     * Sets the hashing algorithm that the cache driver should use to generate the item keys' hashes, this method is chainable.
     *
     * @param {string} algorithm A string containing the name of the hashing algorithm, if set to null, the algorithm that has been declared as default will be used instead.
     *
     * @returns {Cache}
     *
     * @throws InvalidArgumentException If an invalid algorithm name has been given.
     * @throws InvalidArgumentException If an unsupported algorithm has been given.
     */
    setHashingAlgorithm(algorithm){
        if ( algorithm === null || algorithm === _defaultHashingAlgorithm ){
            this._hashingAlgorithm = _defaultHashingAlgorithm;
            if ( this._driverInstance !== null ){
                this._driverInstance.setHashingAlgorithm(_defaultHashingAlgorithm);
            }
            return this;
        }
        if ( algorithm === '' || typeof algorithm !== 'string' ){
            throw new InvalidArgumentException('Invalid algorithm name.', 1);
        }
        if ( crypto.getHashes().indexOf(algorithm) === -1 ){
            throw new InvalidArgumentException('Unsupported algorithm.', 2);
        }
        this._hashingAlgorithm = algorithm;
        if ( this._driverInstance !== null ){
            this._driverInstance.setHashingAlgorithm(algorithm);
        }
        return this;
    }

    /**
     * Returns the hashing algorithm that the cache driver should use to generate the item keys' hashes.
     *
     * @returns {string} A string containing the name of the hashing algorithm, if no algorithm has been defined, the algorithm that has been declared as default will be returned instead.
     */
    getHashingAlgorithm(){
        return this._hashingAlgorithm;
    }

    /**
     * Invokes a given method from the driver that has been defined, then returns the original returned value.
     *
     * @param {string} fn A string representing the method name.
     * @param {any} args The argument to pass to the driver's method.
     *
     * @returns {any} The original value returned by the driver's method.
     *
     * @throws DriverNotDefinedException If no driver has been defined.
     * @throws InvalidArgumentException Unsupported method.
     *
     * @async
     * @private
     */
    async _call(fn, ...args){
        if ( this._driver === null || this._driverInstance === null ){
            throw new DriverNotDefinedException('No driver has been defined.');
        }
        if ( typeof this._driverInstance[fn] !== 'function' ){
            throw new InvalidArgumentException('Unsupported method.', 1);
        }
        try{
            return await this._driverInstance[fn](...args);
        }catch(ex){
            // If the "NotCallableException" is thrown, a method from the common class that has not been overridden has been called, then it's like it is not supported by the driver in use.
            if ( ex.constructor.name === 'NotCallableException' ){
                throw new InvalidArgumentException('Unsupported method.', 1);
            }
            throw ex;
        }
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
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async set(key, value, options){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        await this._call('set', key, value, options);
    }

    /**
     * Returns an entry matching the given identifier key.
     *
     * @param {string} key A string representing the element key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<any>} The entry's value found or null if no entry was found and the "silent" was set to "true".
     *
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async get(key, options){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        return await this._call('get', key, options);
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async exists(key, options){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        return await this._call('exists', key, options);
    }

    /**
     * Checks if a given key exists.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<boolean>} If the key was found will be returned "true", otherwise "false".
     *
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async has(key, options){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        return await this._call('exists', key, options);
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
     * @throws InvalidArgumentException If the given key is not valid.
     *
     * @async
     */
    async expire(key, expire, options){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        return await this._call('expire', key, expire, options);
    }

    /**
     * Removes an entry from the cache.
     *
     * @param {string} key A string representing the element's key.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws InvalidArgumentException If the given key is not valid.
     */
    async remove(key, options){
        if ( key === '' || typeof key !== 'string' ){
            throw new InvalidArgumentException('Invalid key.', 3);
        }
        await this._call('remove', key, options);
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
        await this._call('invalidate', options);
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
     * @async
     */
    async increment(key, value, options){
        await this._call('increment', key, value, options);
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
     * @async
     */
    async decrement(key, value, options){
        await this._call('decrement', key, value, options);
    }

    /**
     * Saves multiple entries within the cache.
     *
     * @param {object} items An object containing the items to store as key/value pairs having as key a string representing the item key and as value the value to store.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async setMulti(items, options){
        await this._call('setMulti', items, options);
    }

    /**
     * Returns multiple entries matching the given identifier keys.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<object>} An object having as key the item identifier key and as value its value or null if the item wasn't found.
     *
     * @async
     */
    async getMulti(keys, options){
        return await this._call('getMulti', keys, options);
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
     * @async
     */
    async existsMulti(keys, all = false, options){
        return await this._call('existsMulti', keys, all, options);
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
     * @async
     */
    async hasMulti(keys, all = false, options){
        return await this._call('existsMulti', keys, all, options);
    }

    /**
     * Removes multiple entries from the cache.
     *
     * @param {Array<string>} keys A sequential array of strings containing the keys.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async removeMulti(keys, options){
        await this._call('removeMulti', keys, options);
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
     * @async
     */
    async incrementMulti(keys, value, options){
        await this._call('incrementMulti', keys, value, options);
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
     * @async
     */
    async decrementMulti(keys, value, options){
        await this._call('decrementMulti', keys, value, options);
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
     * @async
     */
    async expireMulti(keys, expire, options){
        await this._call('expireMulti', keys, expire, options);
    }
}

module.exports = Cache;