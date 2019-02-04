'use strict';

// Including native modules.
const { EventEmitter } = require('events');
const crypto = require('crypto');

// Including Lala's modules.
const Config = require('../Config/Config');
const CacheTemplate = require('./CacheTemplate');
const Logger = require('../Logger/Logger');
const CacheTemplateRepository = require('./CacheTemplateRepository');
const CacheDriverRepository = require('./CacheDriverRepository');
const ConnectionRepository = require('../Database/ConnectionRepository');
const Connection = require('../Database/connections/Connection');
const ClusteredConnection = require('../Database/connections/ClusteredConnection');
const {
    BadMethodCallException,
    InvalidArgumentException,
    UnsupportedMethodException,
    DriverNotDefinedException,
    NotCallableException
} = require('../Exceptions');

/**
 * @type {CacheTemplate} An instance of the class "CacheTemplate" containing the default configuration that is defined by using the static methods of this class and that will be used whenever no custom template is used in class instance.
 *
 * @private
 */
let _defaultTemplate = new CacheTemplate();

/**
 * @type {{string: *}} An object containing the default connection for each driver registered.
 *
 * @private
 */
let _defaultConnections = {};

class Cache extends EventEmitter {
    /**
     * Initializes the cache according with the settings defined in the configuration file.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async initFromConfig(){
        const cache = Config.getProperty('cache');
        if ( cache === null ){
            return;
        }
        const templates = cache.templates === null || typeof cache.templates !== 'object' ? {} : cache.templates;
        // Loop through all the providers defined in the configuration block.
        for ( const template in templates ){
            if ( templates.hasOwnProperty(template) && template !== '' && typeof template === 'string' ){
                try{
                    // Generate a provider object from current configuration block, then it as globally available.
                    const templateObject = await CacheTemplate.createFromConfigBlock(templates[template]);
                    // TODO: Does overwriting already existing templates at this point make sense?
                    templateObject.register(template, true);
                }catch(ex){
                    Logger.log('[Cache]: Invalid configuration found for provider "' + template + '"');
                }
            }
        }
        try{
            const defaultTemplate = cache.template;
            if ( typeof defaultTemplate === 'string' && defaultTemplate !== '' && CacheTemplateRepository.has(defaultTemplate) ){
                // If the default provider has been defined as a string, get the provider object registered and matching this name.
                const template = CacheTemplateRepository.get(defaultTemplate);
                if ( template !== null ){
                    // Clone the original object making possible to apply changes without affecting original object.
                    _defaultTemplate = Object.assign(Object.create(Object.getPrototypeOf(template)), template);
                }
            }else if ( defaultTemplate !== null && typeof defaultTemplate === 'object' ){
                // If the default provider has been defined as an object, build a provider object from is and then use it.
                _defaultTemplate = await CacheTemplate.createFromConfigBlock(defaultTemplate);
            }
        }catch(ex){
            Logger.log('[Cache]: Configuration found for default provider is not valid.');
        }
        try{
            const defaultConnection = cache.connection;
            if ( typeof defaultConnection === 'string' && defaultConnection !== '' ){
                Cache.setDefaultConnection(defaultConnection);
            }
        }catch(ex){
            Logger.log('[Cache]: Configuration found for default connection is not valid.');
        }
        // Process the default connection making possible to defined the default connection to use for each driver.
        const connections = cache.defaultConnections;
        if ( connections !== null && typeof connections === 'object' ){
            for ( const name in connections ){
                if ( name !== '' && typeof name === 'string' && connections.hasOwnProperty(name) && CacheDriverRepository.has(name) ){
                    if ( connections[name] !== '' && typeof connections[name] === 'string' ){
                        Cache.setDefaultDriverConnection(name, connections[name]);
                    }else{
                        // Get the driver class that will generate the connection object.
                        const driver = CacheDriverRepository.get(name);
                        if ( driver !== null ){
                            let connection = null;
                            if ( Array.isArray(connections[name]) ){
                                if ( typeof driver.createClusteredConnectionFromConfigBlock === 'function'  ){
                                    connection = driver.createClusteredConnectionFromConfigBlock(connections[name]);
                                }
                            }else if ( connections[name] !== null && typeof connections[name] === 'object' ){
                                if ( typeof driver.createConnectionFromConfigBlock === 'function'  ){
                                    connection = driver.createConnectionFromConfigBlock(connections[name]);
                                }
                            }
                            if ( connection !== null ){
                                Cache.setDefaultDriverConnection(name, connection);
                            }
                        }
                    }
                }
            }
        }
        if ( cache.defaultPath !== '' && typeof cache.defaultPath === 'string' ){
            // Sets the path to use by default by file based cache drivers.
            Cache.setDefaultPath(cache.defaultPath);
        }
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
     * Generates an instance of this class based on the settings defined by the configuration template matching the given name.
     *
     * @param {string} name A string representing the name of the template to use to generate the class instance, note that the given template must have been registered first.
     *
     * @returns {Cache} An instance of this class configured using the parameters defined in the configuration template found.
     *
     * @throws {InvalidArgumentException} If the given template name is not valid.
     * @throws {InvalidArgumentException} If no template matching the given name was found.
     */
    static buildFromTemplate(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid template name.', 1);
        }
        const template = CacheTemplateRepository.get(name);
        return template.buildCacheObject();
    }

    /**
     * Generates an instance of this class based on a given configuration template.
     *
     * @param {CacheTemplate} template An instance of the class "CacheTemplate" representing the template to use.
     *
     * @returns {Cache} An instance of this class configured using the parameters defined in the given configuration template.
     *
     * @throws {InvalidArgumentException} If an invalid template object is given.
     */
    static buildFromTemplateObject(template){
        const CacheTemplate = require('./CacheTemplate');
        if ( !template instanceof CacheTemplate ){
            throw new InvalidArgumentException('Invalid configuration template.', 1);
        }
        return template.buildCacheObject();
    }

    /**
     * Resets all the registered drivers allowing them to restore settings, such as configuration from the external global configuration file loaded.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async resetDrivers(){
        const drivers = CacheDriverRepository.getAll();
        let processes = [];
        for ( const name in drivers ){
            if ( drivers.hasOwnProperty(name) && typeof drivers[name].setup === 'function' ){
                processes = drivers[name].setup();
            }
        }
        await Promise.all(processes);
    }

    /**
     * Sets the default driver to use whenever no driver is specified.
     *
     * @param {string} driver A string representing the driver name, the driver must have been registered first.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     */
    static setDefaultDriver(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !CacheDriverRepository.has(driver) ){
            throw new InvalidArgumentException('This driver has not been registered.', 2);
        }
        _defaultTemplate.setDriver(driver);
    }

    /**
     * Returns the default driver to use whenever no driver is specified.
     *
     * @return {string} A string representing the driver name.
     */
    static getDefaultDriver(){
        return _defaultTemplate.getDriver();
    }

    /**
     * Sets the default connection to use.
     *
     * @param {string|null} connection A string containing the connection name, if set to null, the default connection offered by current driver will be used instead.
     *
     * @throws {InvalidArgumentException} If an invalid connection name is given.
     */
    static setDefaultConnection(connection){
        if ( connection === null ){
            _defaultTemplate.setConnection(null);
            return;
        }
        if ( connection === '' || typeof connection !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        _defaultTemplate.setConnection(connection);
    }

    /**
     * Returns the default connection to use.
     *
     * @returns {object|null} An object representing the connection, if the default connection is going to be used, null will be returned instead.
     */
    static getDefaultConnection(){
        return _defaultTemplate.getConnection();
    }

    /**
     * Sets the default connection to use with the given driver.
     *
     * @param {string} driver A string representing the driver name, note that the driver must have been registered first.
     * @param {object|string} connection An instance of the class that represents the connection for the given driver, note that the class must extend the "Connection" class or the "ClusteredConnection" class, alternatively a string referencing a registered connection can be used as well.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     * @throws {InvalidArgumentException} If no connection matching the given name is found.
     * @throws {InvalidArgumentException} If the given connection is not a valid instance of a class that extends the "Connection" class or the "ClusteredConnection" class.
     */
    static setDefaultDriverConnection(driver, connection){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !CacheDriverRepository.has(driver) ){
            throw new InvalidArgumentException('No such driver matching the given name.', 4);
        }
        if ( connection !== '' && typeof connection === 'string' ){
            // Check and get the connection object by the given name.
            const obj = ConnectionRepository.get(driver, connection);
            if ( obj === null ){
                throw new InvalidArgumentException('No such connection matching the given name.', 2);
            }
            _defaultConnections[driver] = obj;
            return;
        }
        if ( connection === null || typeof connection !== 'object' ){
            throw new InvalidArgumentException('Invalid connection object.', 3);
        }
        const parent = connection.prototype;
        if ( !parent instanceof Connection && !parent instanceof ClusteredConnection ){
            throw new InvalidArgumentException('Invalid connection object.', 3);
        }
        _defaultConnections[driver] = connection;
    }

    /**
     * Returns the default connection to use with the given driver.
     *
     * @param {string} driver A string representing the driver name, note that the driver must have been registered first.
     *
     * @returns {object|null} An instance of the class that represents the connection for the given driver, if no connection object has been defined, null will be returned instead.
     */
    static getDefaultDriverConnection(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( !CacheDriverRepository.has(driver) ){
            throw new InvalidArgumentException('No such driver matching the given name.', 4);
        }
        return _defaultConnections.hasOwnProperty(driver) ? _defaultConnections[driver] : null;
    }

    /**
     * Sets the default path to use whenever a driver requires a path to store cached data.
     *
     * @param {string} path A string representing the path.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    static setDefaultPath(path){
        if ( path === null ){
            _defaultTemplate.setPath(null);
            return;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path', 1);
        }
        _defaultTemplate.setPath(path);
    }

    /**
     * Returns the default path that will be used whenever a driver requires a path to store cached data
     *
     * @returns {string|null} A string representing the path, if no default path has been defined, null will be returned instead.
     */
    static getDefaultPath(){
        return _defaultTemplate.getPath();
    }

    /**
     * Sets the default hashing algorithm that the cache driver should use to generate the item keys' hashes.
     *
     * @param {string} algorithm A string containing the name of the hashing algorithm, if set to null, "md5" will be used instead.
     *
     * @throws {InvalidArgumentException} If an invalid algorithm name has been given.
     * @throws {InvalidArgumentException} If an unsupported algorithm has been given.
     */
    static setDefaultHashingAlgorithm(algorithm){
        if ( algorithm === null || algorithm === 'md5' ){
            _defaultTemplate.setHashingAlgorithm('md5');
            return;
        }
        _defaultTemplate.setHashingAlgorithm(algorithm);
    }

    /**
     * Returns the default hashing algorithm that the cache driver should use to generate the item keys' hashes.
     *
     * @returns {string} A string containing the name of the hashing algorithm, if no custom algorithm has been defined, "md5" will be used as default one.
     */
    static getDefaultHashingAlgorithm(){
        return _defaultTemplate.getHashingAlgorithm();
    }

    /**
     * The class constructor.
     *
     * @param {null|string|CacheTemplate} template A string representing the name of the template to use to configure this class instance, alternatively, an instance of the class "CacheTemplate" can be directly used, by default the default template is used.
     *
     * @throws {InvalidArgumentException} If no template matching the given name has been found.
     * @throws {InvalidArgumentException} If an invalid driver template is given.
     */
    constructor(template = null){
        super();
        this._driver = '';
        this._driverInstance = null;
        this._driverOptions = null;
        this._hashingAlgorithm = 'md5';
        this._ttl = null;
        this._namespace = null;
        this._overwrite = false;
        if ( template === null ){
            // Configure this instance using the template that contains the default configuration.
            _defaultTemplate.injectConfiguration(this);
        }else if ( template !== '' && typeof template === 'string' ){
            // Get and use the template that matches the given name.
            const obj = CacheTemplateRepository.get(template);
            if ( obj === null ){
                throw new InvalidArgumentException('The given template does not exist.', 1);
            }
            obj.injectConfiguration(this);
        }else if ( template instanceof CacheTemplate ){
            // Use the template given directly as class instance.
            template.injectConfiguration(this);
        }else{
            throw new InvalidArgumentException('Invalid template', 1);
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
     * Sets the connection that the the driver that has been configured should use to connect to the storage engine, this method is chainable.
     *
     * @param {string|object|null} connection A string representing the name of a registered connection, alternatively, an object representing the connection can be used, if null is given, the default connection will be used.
     *
     * @returns {Cache}
     *
     * @throws {BadMethodCallException} If no driver has been configured.
     * @throws {UnsupportedMethodException} If the configured driver does not support connections.
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
     * Sets the connection that the the driver that has been configured is going to use to connect to the storage engine.
     *
     * @returns {object|null} An object representing the connection, if no connection has been defined, null will be returned instead.
     *
     * @throws {BadMethodCallException} If no driver has been configured.
     * @throws {UnsupportedMethodException} If the configured driver does not support connections.
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
        return this._driverInstance !== null && typeof this._driverInstance.setPath === 'function' && typeof this._driverInstance.getPath === 'function';
    }

    /**
     * Sets the path the driver that has been configured should use, this method is chainable.
     *
     * @param {string} path A string representing the path to the file or the directory.
     *
     * @returns {Cache}
     *
     * @throws {BadMethodCallException} If no driver has been configured yet.
     * @throws {UnsupportedMethodException} If the configured driver does not support file _storage.
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
     * @throws {BadMethodCallException} If no driver has been configured yet.
     * @throws {UnsupportedMethodException} If the configured driver does not support file storage.
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
     * Sets the expiration time for the stored items,this method is chainable.
     *
     * @param {number|null} ttl An integer number greater than zero representing the TTL in seconds, if set to null, no TTL will be applied.
     *
     * @returns {Cache}
     */
    setTTL(ttl){
        this._ttl = ttl === null || isNaN(ttl) || ttl <= 0 ? null : ttl;
        if ( this._driverInstance !== null ){
            this._driverInstance.setTTL(this._ttl);
        }
        return this;
    }

    /**
     * Returns the expiration time that is going to be applied to the items.
     *
     * @returns {number|null} An integer number greater than zero representing the TTL value in seconds, if no TTL is going to be use, null will be returned instead.
     */
    getTTL(){
        if ( this._driverInstance !== null ){
            this._ttl = this._driverInstance.getTTL();
        }
        return this._ttl;
    }

    /**
     * Sets the namespace that will be used to group cached entries, this method is chainable.
     *
     * @param {string|null} namespace A string representing the namespace, if set to null, no namespace will be used.
     *
     * @returns {Cache}
     *
     * @throws {InvalidArgumentException} If an invalid namespace were given.
     */
    setNamespace(namespace){
        if ( namespace !== null && typeof namespace !== 'string' ){
            throw new InvalidArgumentException('Invalid namespace', 1);
        }
        this._namespace = namespace === '' ? null : namespace;
        if ( this._driverInstance !== null ){
            this._driverInstance.setNamespace(this._namespace);
        }
        return this;
    }

    /**
     * Returns the namespace that will be used to group cached entries.
     *
     * @returns {string|null} A string representing the namespace, if no namespace has been defined, null will be returned instead.
     */
    getNamespace(){
        if ( this._driverInstance !== null ){
            this._namespace = this._driverInstance.getNamespace();
        }
        return this._namespace;
    }

    /**
     * Sets if an older entry can be replaced by a newer one, if not, an exception will be thrown at write time, this method is chainable.
     *
     * @param {boolean} overwrite If set to "true" entry overwrite will be allowed, otherwise not.
     *
     * @returns {Cache}
     */
    setOverwrite(overwrite){
        this._overwrite = overwrite === true;
        if ( this._driverInstance !== null ){
            this._driverInstance.setOverwrite(this._overwrite);
        }
        return this;
    }

    /**
     * Returns if an older entry can be replaced by a newer one or not.
     *
     * @returns {boolean} If entry overwrite is allowed will be returned "true", otherwise "false".
     */
    getOverwrite(){
        if ( this._driverInstance !== null ){
            this._overwrite = this._driverInstance.setOverwrite();
        }
        return this._overwrite;
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
     * @param {string} driver A string representing the driver name, note that the driver must have been registered first.
     *
     * @returns {Cache}
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver is not supported or has not been registered yet.
     */
    async setDriver(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        const obj = CacheDriverRepository.get(driver);
        if ( obj === null ){
            throw new InvalidArgumentException('Unsupported driver.', 2);
        }
        this._driverInstance = null;
        this._driver = driver;
        this._driverInstance = new obj();
        const connection = _defaultTemplate.getConnection();
        if ( connection !== null && this.connectionSupported() ){
            this._driverInstance.setConnection(connection);
        }
        const path = _defaultTemplate.getPath();
        if ( path !== null && this.pathSupported() ){
            this._driverInstance.setPath(path);
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
     * @throws {InvalidArgumentException} If an invalid algorithm name has been given.
     * @throws {InvalidArgumentException} If an unsupported algorithm has been given.
     */
    setHashingAlgorithm(algorithm){
        const defaultAlgorithm = _defaultTemplate.getHashingAlgorithm();
        if ( algorithm === null || algorithm === defaultAlgorithm ){
            this._hashingAlgorithm = defaultAlgorithm;
            if ( this._driverInstance !== null ){
                this._driverInstance.setHashingAlgorithm(defaultAlgorithm);
            }
            return this;
        }
        if ( algorithm === '' || typeof algorithm !== 'string' ){
            throw new InvalidArgumentException('Invalid algorithm name.', 1);
        }
        if ( !Cache.isSupportedHashingAlgorithm(algorithm) ){
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
     * @param {*} args The argument to pass to the driver's method.
     *
     * @returns {*} The original value returned by the driver's method.
     *
     * @throws {DriverNotDefinedException} If no driver has been defined.
     * @throws {InvalidArgumentException} Unsupported method.
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
            const result = await this._driverInstance[fn](...args);
            // Emit the event based on the operation done.
            if ( typeof result !== 'undefined' ){
                this.emit(fn, ...args, result);
                // Emit the event for read operations.
                this.emit('read', fn, ...args, result);
                // Emit the generic event.
                this.emit('transaction', fn, ...args, result);
                return result;
            }
            this.emit(fn, ...args);
            // Emit the event for write operations.
            this.emit('write', fn, ...args, result);
            // Emit the generic event.
            this.emit('transaction', fn, ...args);
        }catch(ex){
            // If the "NotCallableException" is thrown, a method from the common class that has not been overridden has been called, then it's like it is not supported by the driver in use.
            if ( ex.constructor === NotCallableException ){
                throw new InvalidArgumentException('Unsupported method.', 1);
            }
            throw ex;
        }
    }

    /**
     * Saves an entry within the cache.
     *
     * @param {string} key A string representing the entry's identifier.
     * @param {*} value The value that will be cached.
     * @param {object<string, any>?} options An object representing the additional options to consider.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If the given key is not valid.
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
     * @throws {InvalidArgumentException} If the given key is not valid.
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
     * @throws {InvalidArgumentException} If the given key is not valid.
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
     * @throws {InvalidArgumentException} If the given key is not valid.
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
     * @throws {InvalidArgumentException} If the given key is not valid.
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
     * @throws {InvalidArgumentException} If the given key is not valid.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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
     * @param {string[]} keys A sequential array of strings containing the keys.
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