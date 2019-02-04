'use strict';

// Including Lala's modules.
const Logger = require('../../Logger/Logger');
const Connection = require('./Connection');
const {
    InvalidArgumentException,
    UnresolvedDependencyException,
    AuthenticationException
} = require('../../Exceptions');

// Try importing required external module (if it has been installed).
let _redis = null;
try{
    _redis = require('redis');
}catch(ex){
    Logger.log('Failed loading "redis" module.', 2);
}

class RedisConnection extends Connection {
    /**
     * The class constructor.
     */
    constructor(){
        super();
        this._host = '127.0.0.1';
        this._port = 6379;
        this._path = null;
        this._database = 0;
        this._password = null;
    }

    /**
     * Sets the hostname or the host's IP address where the Redis server is running on, this method is chainable.
     *
     * @param {string|null} host A string representing the host, if null is given, "127.0.0.1" will be used instead.
     *
     * @returns {RedisConnection}
     *
     * @throws InvalidArgumentException If an invalid host were given.
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
     * Returns the hostname or the host's IP address where the Redis server is running on.
     *
     * @returns {string} A string representing the host.
     */
    getHost(){
        return this._host;
    }

    /**
     * Sets the post where the Redis server is listening at, this method is chainable.
     *
     * @param {number|null} port An integer number greater than zero and lower or equal than 65535 representing the port number, by default 6379.
     *
     * @returns {RedisConnection}
     *
     * @throws InvalidArgumentException If an invalid port number were given.
     */
    setPort(port){
        if ( port === null ){
            this._port = 6379;
            return this;
        }
        if ( isNaN(port) || port <= 0 || port > 65535 ){
            throw new InvalidArgumentException('Invalid port number.', 1);
        }
        this._port = port;
        return this;
    }

    /**
     * Returns the post where the Redis server is listening at.
     *
     * @returns {number} An integer number greater than zero and lower or equal than 65535 representing the port number.
     */
    getPort(){
        return this._port;
    }

    /**
     * Sets the path to the UNIX socket where the Redis server is listening at, this method is chainable.
     *
     * @param {string|null} path A string representing the path to the UNIX socket, if set to null no socket will be used, otherwise UNIX socket will be preferred over TCP connection.
     *
     * @returns {RedisConnection}
     *
     * @throws InvalidArgumentException If an invalid path were given.
     */
    setPath(path){
        if ( path === null || path === '' ){
            this._path = null;
            return this;
        }
        if ( typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._path = path;
        return this;
    }

    /**
     * Returns the path to the UNIX socket where the Redis server is listening at.
     *
     * @returns {string} A string representing the path to the UNIX socket, if no file has been defined, null will be returned instead.
     */
    getPath(){
        return this._path;
    }

    /**
     * Sets the database to use, this method is chainable.
     *
     * @param {number|null} database An integer number greater or equal than zero representing the database number, by default 0.
     *
     * @returns {RedisConnection}
     *
     * @throws InvalidArgumentException If an invalid database number were given.
     */
    setDatabase(database){
        if ( database === null || database <= 0 ){
            this._database = 0;
            return this;
        }
        if ( isNaN(database) ){
            throw new InvalidArgumentException('Invalid database number.', 1);
        }
        this._database = database;
        return this;
    }

    /**
     * Returns the database to use.
     *
     * @returns {number} An integer number greater or equal than zero representing the database number.
     */
    getDatabase(){
        return this._database;
    }

    /**
     * Sets the password to use during connection if the Redis server requires an authentication, this method is chainable.
     *
     * @param {string|null} password A string representing the password, if set to null, no authentication will be done.
     *
     * @returns {RedisConnection}
     *
     * @throws InvalidArgumentException If an invalid password were given.
     */
    setPassword(password){
        if ( password === null || password === '' ){
            this._password = null;
            return this;
        }
        if ( typeof password !== 'string' ){
            throw new InvalidArgumentException('Invalid password.', 1);
        }
        this._password = password;
        return this;
    }

    /**
     * Prepares the object used to defined the connection parameters for the Redis client.
     *
     * @returns {object} An object containing the connection parameters.
     *
     * @private
     */
    _buildOptions(){
        let options = Object.assign(this._options, {
            db: this._database
        });
        if ( this._path !== null ){
            options.path = this._path;
        }else{
            options.host = this._host;
            options.port = this._port;
        }
        if ( this._password !== null ){
            options.password = this._password;
        }
        return options;
    }

    /**
     * Establishes a connection with the Redis server.
     *
     * @returns {Promise<void>}
     *
     * @throws UnresolvedDependencyException If the Redis module was not found.
     *
     * @async
     */
    connect(){
        return new Promise((resolve, reject) => {
            if ( _redis === null ){
                throw new UnresolvedDependencyException('Redis module missing, run "npm install redis" first.', 1);
            }
            this._connected = false;
            // Generate the options for the Redis client based on configured properties.
            const options = this._buildOptions();
            // Create the Redis client.
            this._connection = _redis.createClient(options);
            this._connection.on('ready', () => {
                this._connected = true;
                return resolve();
            });
            this._connection.on('error', (error) => {
                if ( error instanceof Error && error.code === 'NOAUTH' ){
                    return reject(new AuthenticationException('The given password is not correct.', 2));
                }
            });
        });
    }

    /**
     * Establishes a new connection with the Redis server.
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
            this._connection.quit();
        }
    }

    /**
     * Checks if the connection is still alive.
     *
     * @returns {boolean} If the Redis server is still connected will be returned "true", otherwise "false".
     */
    isConnected(){
        return this._connected === true && this._connection.connected === true;
    }
}

module.exports = RedisConnection;