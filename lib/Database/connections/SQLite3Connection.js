'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Connection = require('./Connection');
const {
    InvalidArgumentException,
    UnresolvedDependencyException
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
    Logger.log('Failed loading the "sqlite3" module.', 2);
}

class SQLite3Connection extends Connection {
    /**
     * Generates a class instance based on the properties obtained from a configuration file.
     *
     * @param {object} block An object containing the properties fetched from the configuration file.
     *
     * @throws InvalidArgumentException If an invalid configuration block were given.
     */
    static createFromConfigBlock(block){
        if ( block === null || typeof block !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration block.', 1);
        }
        let connection = new SQLite3Connection();
        if ( block.path !== '' && typeof block.path === 'string' ){
            connection.setPath(block.path);
        }
        if ( block.passphrase !== '' && typeof block.passphrase === 'string' ){
            connection.setPassphrase(block.passphrase);
        }
        return connection;
    }

    /**
     * The class constructor.
     */
    constructor(){
        super();
        this._path = null;
        this._passphrase = null;
        this._mode = null;
    }

    /**
     * Sets the path of the SQLite database to connect, this method is chainable.
     *
     * @param {string|null} path A string containing the path to the database file, if set to null, an anonymous in-memory database wil be created instead, note that this kind of databases are not persistent.
     *
     * @returns {SQLite3Connection}
     *
     * @throws InvalidArgumentException If an invalid path is given.
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
     * Returns the path of the SQLite database to connect.
     *
     * @returns {string|null} A string containing the path to the database, if an in-memory database has been defined, null will be returned instead.
     */
    getPath(){
        return this._path;
    }

    /**
     * Sets the passphrase to use to decrypt the database, this method is chainable.
     *
     * @param {string|null} passphrase A string representing the passphrase, if set to null, no passphrase will be used.
     *
     * @returns {SQLite3Connection}
     *
     * @throws InvalidArgumentException If an invalid passphrase is given.
     */
    setPassphrase(passphrase){
        //TODO: Enable support for this feature.
        if ( passphrase === null ){
            this._passphrase = null;
            return this;
        }
        if ( passphrase === '' || typeof passphrase !== 'string' ){
            throw new InvalidArgumentException('Invalid passphrase.', 1);
        }
        this._passphrase = passphrase;
        return this;
    }

    /**
     * Returns the passphrase that will be used do decrypt the database.
     *
     * @returns {string|null} A string representing the passphrase, is no passphrase has been defined, null will be returned instead.
     */
    getPassphrase(){
        return this._passphrase;
    }

    /**
     * Establishes a connection with the SQLite3 database.
     *
     * @returns {Promise<void>}
     *
     * @throws UnresolvedDependencyException If the SQLite3 module was not found.
     *
     * @async
     */
    async connect() {
        if ( _sqlite3 === null ){
            throw new UnresolvedDependencyException('SQLite3 module missing, run "npm install sqlite3" first.', 1);
        }
        // Preparing connection parameters.
        let mode = this._mode === null ? _sqlite3.OPEN_READWRITE | _sqlite3.OPEN_CREATE : this._mode;
        let filename = this._path === null ? ':memory:' : this._path;
        this._connected = false;
        return new Promise((resolve, reject) => {
            // Generating the class instance that will represent the connection with the database.
            this._connection = new _sqlite3.Database(filename, mode, (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                this._connected = true;
                resolve();
            });
        });
    }

    /**
     * Establishes a new connection with the SQLite3 database.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async reconnect(){
        await this.disconnect();
        await this.connect();
    }

    /**
     * Closes the connection with the SQLite3 database in use.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async disconnect(){
        if ( this._connected === true ){
            // Close the connection with the database and check that everything went fine.
            return new Promise((resolve, reject) => {
                this._connection.close((error) => {
                    if ( error !== null ){
                        return reject(error);
                    }
                    this._connection = null;
                    this._connected = false;
                    resolve();
                });
            });
        }
    }

    /**
     * Checks if the connection is still alive.
     *
     * @returns {boolean} If the SQLite3 database is still connected will be returned "true", otherwise "false".
     */
    isConnected(){
        return this._connected === true;
    }
}

module.exports = SQLite3Connection;