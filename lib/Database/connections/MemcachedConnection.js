'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Connection = require('./Connection');
const {
    InvalidArgumentException,
    UnresolvedDependencyException
} = require('../../Exceptions');

/**
 * @type {object} _memcached An object representing the Memcached driver.
 *
 * @private
 */
let _memcached = null;
try{
    // Try importing required external module (if it has been installed).
    _memcached = require('memcached');
}catch{
    Logger.log('Failed loading "memcached" module.', 2);
}

/**
 * The class used to represent a to a single Memcached server.
 */
class MemcachedConnection extends Connection {
    /**
     * The class constructor.
     *
     * @throws {UnresolvedDependencyException} If the Memcached module was not found.
     */
    constructor(){
        super();
        if ( _memcached === null ){
            throw new UnresolvedDependencyException('Memcached module missing, run "npm i memcached" first.', 1);
        }

        /**
         * @type {string} _host A string representing the host where the Memcached server is listening at.
         *
         * @private
         */
        this._host = '127.0.0.1';

        /**
         * @type {number} _port An integer number greater than zero and lower or equal than 65535 representing the number of the port where the Memcached server is listening at.
         *
         * @private
         */
        this._port = 11211;
    }

    /**
     * Sets the hostname or the host's IP address where the Memcached server is running on, this method is chainable.
     *
     * @param {(string|null)} host A string representing the host, if null is given, "127.0.0.1" will be used instead.
     *
     * @returns {MemcachedConnection}
     *
     * @throws {InvalidArgumentException} If an invalid host were given.
     */
    setHost(host){
        if ( host === null || host === '' ){
            this._host = '127.0.0.1';
            return this;
        }
        if ( typeof host !== 'string' ){
            throw new InvalidArgumentException('Invalid host.', 1);
        }
        this._host = host;
        return this;
    }

    /**
     * Returns the hostname or the host's IP address where the Memcached server is running on.
     *
     * @returns {string} A string representing the host.
     */
    getHost(){
        return this._host;
    }

    /**
     * Sets the post where the Memcached server is listening at, this method is chainable.
     *
     * @param {(number|null)} port An integer number greater than zero and lower or equal than 65535 representing the port number, by default 11211.
     *
     * @returns {MemcachedConnection}
     *
     * @throws {InvalidArgumentException} If an invalid port number were given.
     */
    setPort(port){
        if ( port === null ){
            this._port = 11211;
            return this;
        }
        if ( isNaN(port) || port <= 0 || port > 65535 ){
            throw new InvalidArgumentException('Invalid port number.', 1);
        }
        this._port = port;
        return this;
    }

    /**
     * Returns the post where the Memcached server is listening at.
     *
     * @returns {number} An integer number greater than zero and lower or equal than 65535 representing the port number.
     */
    getPort(){
        return this._port;
    }

    /**
     * Establishes a connection with the Memcached server.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async connect() {
        this._connected = false;
        // Generate the connection string for a single node.
        const url = this.getHost() + ':' + this.getPort().toString();
        // Initialize the Memcached instance and connect to the server.
        this._connection = new _memcached([url], this._options);
        this._connected = true;
    }

    /**
     * Establishes a new connection with the Memcached server.
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
     * Closes the connection with the context.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async disconnect(){
        if ( this._connected === true ){
            this._connection.end();
        }
    }

    /**
     * Checks if the connection is still alive.
     *
     * @returns {boolean} If the Memcached server is still connected will be returned "true", otherwise "false".
     */
    isConnected(){
        return this._connected === true;
    }

    /**
     * Returns the URL according to the connection parameters that have been defined.
     *
     * @returns {string} A string representing the URL.
     */
    toString(){
        return this._host + ':' + this._port.toString();
    }
}

module.exports = MemcachedConnection;
