'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const CredentialsProvider = require('./CredentialsProvider');
const CacheRepository = require('../../Cache/CacheRepository');
const Credentials = require('../../Types/Credentials');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Represents a credentials provider where credentials come from a defined set or file.
 */
class RepositoryBasedCredentialsProvider extends CredentialsProvider {
    /**
     * Returns the cache instance that will be used to store credentials after preloading.
     *
     * @returns {?Cache} An instance of the class "Cache" or null if no eligible instance has been found.
     *
     * @protected
     */
    static _getCacheInstance(){
        const cache = CacheRepository.get('@credentialProviders');
        return cache !== null ? cache : CacheRepository.get('@default');
    }

    /**
     * The class constructor.
     *
     * @param {?(Map<string, (string|object|Credentials)>|{string: *})} [credentials=null] A map or a plain object containing the credentials and having as key the username and as value the password or an object representing the credentials for this user.
     */
    constructor(credentials = null){
        super();

        /**
         * @type {Map<string, Credentials>} _credentials A map containing all the credentials defined and having as key the unique user identifier and as value an instance of the class "Credentials" representing the credentials including both the user ID and password.
         *
         * @protected
         */
        this._credentials = new Map();

        /**
         * @type {?string} _credentialsFile A string containing the path to the JSON file that contains all the user credentials.
         *
         * @protected
         */
        this._credentialsFile = null;

        /**
         * @type {boolean} [_credentialsPreloading=false] If set to "true" it means that the credentials contained from the defined file will be loaded and saved for next uses.
         *
         * @protected
         */
        this._credentialsPreloading = false;

        if ( credentials !== null && typeof credentials === 'object' ){
            if ( credentials instanceof Map ){
                this.setCredentials(credentials);
            }else{
                this.setCredentialsAsObject(credentials);
            }
        }
    }

    /**
     * Sets the accepted credentials, this method is chainable.
     *
     * @param {?Map<string, (string|object|Credentials)>} credentials A map containing the credentials and having as key the username as value a string representing the password or an instance of the class "Credentials" (or a plain object) containing both the password and some custom user data.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     *
     * @throws {InvalidArgumentException} If an invalid map is given.
     */
    setCredentials(credentials){
        if ( credentials !== null && !( credentials instanceof Map ) ){
            throw new InvalidArgumentException('Invalid credentials map.', 1);
        }
        this._credentials = new Map();
        if ( credentials !== null ){
            // Validate given credentials in order to standardize credentials format.
            for ( const [_identifier, _credentials] of credentials ){
                const credentialsObject = RepositoryBasedCredentialsProvider._generateCredentialsObject(_identifier, _credentials);
                if ( credentialsObject !== null ){
                    this._credentials.set(_identifier, credentialsObject);
                }
            }
        }
        return this;
    }

    /**
     * Sets available user credentials using a plain object as parameter, this method is chainable.
     *
     * @param {?Object.<string, *>} credentials An object containing the credentials having as key the unique user identifier and as value a string containing the password, alternatively, an instance of the class Credentials or an object containing the password and user data can be used.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setCredentialsAsObject(credentials){
        if ( typeof credentials !== 'object' ){
            throw new InvalidArgumentException('Invalid credentials.', 1);
        }
        this._credentials = new Map();
        if ( credentials !== null ){
            for ( const identifier in credentials ){
                if ( credentials.hasOwnProperty(identifier) ){
                    const credentialsObject = RepositoryBasedCredentialsProvider._generateCredentialsObject(identifier, credentials[identifier]);
                    if ( credentialsObject !== null ){
                        this._credentials.set(identifier, credentialsObject);
                    }
                }
            }
        }
        return this;
    }

    /**
     * Returns all the accepted credentials defined.
     *
     * @returns {Map<string, Credentials>} A map containing as key the username and as value the corresponding password.
     */
    getCredentials(){
        return this._credentials;
    }

    /**
     * Adds a credential to the internal list, this method is chainable.
     *
     * @param {string} identifier A string representing the unique user identifier.
     * @param {string} password A string representing the password associated to the user to add.
     * @param {*} [userData=null] Some optional data related to this user.
     * @param {boolean} [overwrite=false] If set to "true" and if given username has already been defined it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     * @throws {InvalidArgumentException} If an invalid password is given.
     * @throws {InvalidArgumentException} If the given username has already been defined and if the "overwrite" argument was not set to "true".
     */
    addCredentials(identifier, password, userData = null, overwrite = false){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof password !== 'string' ){
            throw new InvalidArgumentException('Invalid password.', 2);
        }
        if ( overwrite !== true && this._credentials.has(identifier) ){
            throw new InvalidArgumentException('Identifier already defined.', 3);
        }
        const credentials = new Credentials(identifier, password);
        if ( userData !== null ){
            credentials.setUserData(userData);
        }
        this._credentials.set(identifier, credentials);
        return this;
    }

    /**
     * Adds a credential to the list of all the accepted credentials, this method is chainable.
     *
     * @param {string} identifier A string representing the unique user identifier.
     * @param {Credentials} credentials An instance of the class "Credentials" representing the credentials to add.
     * @param {boolean} [overwrite=false] If set to "true" and if given username has already been defined it will be overwritten, otherwise an exception will be thrown.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     * @throws {InvalidArgumentException} If an invalid instance of the class "Credentials" is given.
     * @throws {InvalidArgumentException} If the given username has already been defined and if the "overwrite" argument was not set to "true".
     */
    addCredentialsObject(identifier, credentials, overwrite = false){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( credentials instanceof Credentials ){
            throw new InvalidArgumentException('Invalid credentials.', 2);
        }
        if ( overwrite !== true && this._credentials.has(identifier) ){
            throw new InvalidArgumentException('Identifier already defined.', 3);
        }
        this._credentials.set(identifier, credentials);
        return this;
    }

    /**
     * Removes an username and the related password from the list of all the accepted credentials, this method is chainable.
     *
     * @param {string} identifier A string representing the unique user identifier to wipe out.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     */
    removeCredentials(identifier){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        this._credentials.delete(identifier);
        return this;
    }

    /**
     * Removes all the credentials that have been defined, this method is chainable.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     */
    dropCredentials(){
        this._credentials = new Map();
        return this;
    }

    /**
     * Sets the path to the JSON file that contains all the accepted user credentials, this method is chainable.
     *
     * @param {?string} path A string representing the path to the file.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     *
     * @throws {InvalidArgumentException} If an invalid file path has been defined.
     */
    setCredentialsFile(path){
        if ( path !== null && typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid file path.', 1);
        }
        this._credentialsFile = path === '' ? null : path;
        return this;
    }

    /**
     * Returns the path to the credentials file that has been defined.
     *
     * @returns {?string} A string representing the path to the file or null if no path has been defined.
     */
    getCredentialsFile(){
        return this._credentialsFile;
    }

    /**
     * Sets if credentials loaded from file should be cached for next uses, this method is chainable.
     *
     * @param {boolean} preloading If set to "true" credentials loaded from the JSON file defined will be cached.
     *
     * @returns {RepositoryBasedCredentialsProvider}
     */
    setCredentialsPreloading(preloading){
        this._credentialsPreloading = preloading === true;
        return this;
    }

    /**
     * Returns if credentials loaded from file should be cached for next uses.
     *
     * @returns {boolean} If credentials caching has been enabled will be returned "true", otherwise "false".
     */
    getCredentialsPreloading(){
        return this._credentialsPreloading === true;
    }

    /**
     * Loads and save in cache the credentials found in the JSON file defined.
     *
     * @returns {Promise<?Map<string, *>>} A map containing as key the user identifier and as value an object containing its password and eventually some other user information, if cache is not available nor no file has been defined, null is returned instead.
     *
     * @async
     */
    async preloadCredentials(){
        let credentials = null;
        // Get the default cache instance.
        const cache = RepositoryBasedCredentialsProvider._getCacheInstance();
        if ( cache !== null && this._credentialsFile !== null ){

            // TODO: Remove this block once task number #LALA-12 has been completed.
            const namespace = cache.getNamespace();
            cache.setNamespace('com.lala.auth');

            credentials = await this.loadCredentialsFromFile();
            await cache.set('credentials', credentials, {
                overwrite: true,
                namespace: 'com.lala.auth' // TODO: Currently not supported.
            });

            // TODO: Remove this block once task number #LALA-12 has been completed.
            cache.setNamespace(namespace);
        }
        return credentials;
    }

    /**
     * Loads credentials from the JSON file defined.
     *
     * @returns {Promise<?Map<string, {password: string}>>} A map containing the credentials from the JSON file defined having as key the unique user ID and as value an object containing its password and eventually some custom data related to the user.
     *
     * @throws {RuntimeException} If an error occurs while reading the JSON file defined.
     * @throws {RuntimeException} If an error occurs while parsing JSON content.
     *
     * @async
     */
    async loadCredentialsFromFile(){
        if ( this._credentialsFile ===  null ){
            return null;
        }
        return new Promise((resolve, reject) => {
            filesystem.readFile(this._credentialsFile, (error, data) => {
                if ( error !== null ){
                    const exception = new RuntimeException('An error occurred while reading the credentials file.', 1, error);
                    return reject(exception);
                }
                try{
                    // Parse file contents.
                    const credentials = JSON.parse(data.toString());
                    // Generate the map that will contain all the valid credentials found.
                    const credentialsMap = new Map();
                    if ( credentials !== null && typeof credentials === 'object' ){
                        for ( const identifier in credentials ){
                            if ( credentials.hasOwnProperty(identifier) && typeof identifier === 'string' && identifier !== '' ){
                                // Current credential is an identifier/password pair.
                                if ( typeof credentials[identifier] === 'string' ){
                                    credentialsMap.set(identifier, {
                                        password: credentials[identifier]
                                    });
                                }else if ( credentials[identifier] !== null && typeof credentials[identifier] === 'object' ){
                                    if ( credentials[identifier].hasOwnProperty('password') && typeof credentials[identifier].password === 'string' ){
                                        // Current credential is an object containing the password and some more information, such as user data.
                                        credentialsMap.set(identifier, credentials[identifier]);
                                    }
                                }
                            }
                        }
                    }
                    resolve(credentialsMap);
                }catch(ex){
                    const exception = new RuntimeException('Malformed credentials JSON file.', 2, ex);
                    return reject(exception);
                }
            });
        });
    }

    /**
     * Looks up credentials from the JSON file that has been defined.
     *
     * @param {string} identifier A string representing the unique user identifier.
     *
     * @returns {Promise<?Credentials>} An instance of the class "Credentials" representing the credentials found or null if no credentials associated to the given user identifier are found.
     *
     * @protected
     */
    async _lookupFromFile(identifier){
        let credentials = undefined;
        if ( this._credentialsPreloading === true ){
            // Get the default cache instance.
            const cache = RepositoryBasedCredentialsProvider._getCacheInstance();
            if ( cache !== null ){
                // TODO: Remove this block once task number #LALA-12 has been completed.
                const namespace = cache.getNamespace();
                cache.setNamespace('com.lala.auth');

                let preloadedCredentials = cache.get('credentials', {
                    silent: true
                });

                // TODO: Remove this block once task number #LALA-12 has been completed.
                cache.setNamespace(namespace);

                if ( preloadedCredentials === null ){
                    preloadedCredentials = await this.preloadCredentials();
                }
                credentials = preloadedCredentials instanceof Map ? preloadedCredentials.get(identifier) : undefined;
            }
        }
        if ( typeof credentials === 'undefined' ){
            const loadedCredentials = await this.loadCredentialsFromFile();
            credentials = loadedCredentials !== null ? loadedCredentials.get(identifier) : undefined;
            if ( typeof credentials !== 'undefined' && this._credentialsPreloading === true ){
                await this.preloadCredentials();
            }
        }
        return typeof credentials !== 'undefined' ? RepositoryBasedCredentialsProvider._generateCredentialsObject(identifier, credentials) : null;
    }

    /**
     * Looks up user credentials based an a given user unique identifier, such as the username.
     *
     * @param {string} identifier A string representing the unique identifier of the user whose credentials will be looked up.
     *
     * @returns {Promise<?Credentials>} An instance of the class "Credentials" representing the credentials found null if no credential is found.
     *
     * @throws {InvalidArgumentException} If an invalid user identifier is given.
     *
     * @async
     * @override
     */
    async lookup(identifier){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid username.', 1);
        }
        let credentials = null;
        for ( const [_identifier, _credentials] of this._credentials ){
            if ( _identifier === identifier ){
                credentials = _credentials;
                break;
            }
        }
        if ( credentials === null && this._credentialsFile !== null ){
            credentials = await this._lookupFromFile(identifier);
        }
        return credentials;
    }
}

module.exports = RepositoryBasedCredentialsProvider;