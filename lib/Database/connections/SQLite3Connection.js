'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Connection = require('./Connection');
const {
    InvalidArgumentException,
    UnresolvedDependencyException,
    RuntimeException
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
     * The class constructor.
     */
    constructor(){
        super();
        this._path = null;
        this._passphrase = null;
        this._mode = null;
        this._modes = [];
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
     * Sets how the defined SQLite database should be opened, this method is chainable.
     *
     * @param {string|number|string[]|number[]} mode The mode the database should be opened in, multiple modes can be combined by passing an array of modes, modes name ("readonly", "readwrite" and "create") are accepted as well as numeric codes.
     *
     * @returns {SQLite3Connection}
     */
    setMode(mode){
        if ( !Array.isArray(mode) ){
            mode = [mode];
        }
        const length = mode.length;
        let modes = [];
        let code = 0;
        // Validate the given modes.
        for ( let i = 0 ; i < length ; i++ ){
            switch ( mode[i] ){
                case 'readonly':
                case 'read_only':
                case _sqlite3.OPEN_READONLY: {
                    // The database will be opened just for read operations, any write operation will lead to an exception.
                    modes.push(_sqlite3.OPEN_READONLY);
                    code = code | _sqlite3.OPEN_READONLY;
                }break;
                case 'readwrite':
                case 'read_write':
                case _sqlite3.OPEN_READWRITE: {
                    // The database will be opened for both reads and writes.
                    modes.push(_sqlite3.OPEN_READWRITE);
                    code = code | _sqlite3.OPEN_READWRITE;
                }break;
                case 'create':
                case _sqlite3.OPEN_CREATE: {
                    // Same as "readwrite" but if the database doesn't exists it will be created instead of throwing an exception.
                    modes.push(_sqlite3.OPEN_CREATE);
                    code = code | _sqlite3.OPEN_CREATE;
                }break;
            }
        }
        this._mode = code === 0 ? null : code;
        this._modes = modes;
        return this;
    }

    /**
     * Returns all the modes that will be applied in database connection.
     *
     * @returns {string[]} A sequential array of strings containing the name of the defined opening modes.
     */
    getMode(){
        let modes = [];
        const length = this._modes.length;
        if ( length === 0 ){
            return ['readwrite', 'create'];
        }
        for ( let i = 0 ; i < length ; i++ ){
            switch ( this._modes[i] ){
                case _sqlite3.OPEN_READONLY: {
                    modes.push('readonly');
                }break;
                case _sqlite3.OPEN_READWRITE: {
                    modes.push('readwrite');
                }break;
                case _sqlite3.OPEN_CREATE: {
                    modes.push('create');
                }break;
            }
        }
        return modes;
    }

    /**
     * Returns all the modes that will be applied in database connection as numeric codes.
     *
     * @returns {number[]} A sequential array of integer numbers representing the code of the defined opening modes.
     */
    getModeCode(){
        return this._modes.length === 0 ? [_sqlite3.OPEN_READWRITE, _sqlite3.OPEN_CREATE] : this._modes;
    }

    /**
     * Returns the database opening mode as a single numeric value.
     *
     * @returns {number} An integer number representing the database opening mode obtained by merging all the defined modes using the bitwise or operator.
     */
    getModeComputedCode(){
        return this._mode === null ? _sqlite3.OPEN_READWRITE | _sqlite3.OPEN_CREATE : this._mode;
    }

    /**
     * Establishes a connection with the SQLite3 database.
     *
     * @returns {Promise<void>}
     *
     * @throws UnresolvedDependencyException If the SQLite3 module was not found.
     * @throws RuntimeException If an error occurs during database connection.
     *
     * @async
     */
    async connect() {
        if ( _sqlite3 === null ){
            throw new UnresolvedDependencyException('SQLite3 module missing, run "npm install sqlite3" first.', 1);
        }
        // Preparing connection parameters.
        const mode = this.getModeComputedCode();
        const filename = this._path === null ? ':memory:' : this._path;
        this._connected = false;
        return new Promise((resolve, reject) => {
            // Generating the class instance that will represent the connection with the database.
            this._connection = new _sqlite3.Database(filename, mode, (error) => {
                if ( error !== null ){
                    return reject(new RuntimeException('An error occurred during database connection.', 2, error));
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
     * @throws RuntimeException If an error occurs while disconnecting the database.
     *
     * @async
     */
    async disconnect(){
        if ( this._connected === true ){
            // Close the connection with the database and check that everything went fine.
            return new Promise((resolve, reject) => {
                this._connection.close((error) => {
                    if ( error !== null ){
                        return reject(new RuntimeException('An error occurred while disconnecting the database.', 1, error));
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