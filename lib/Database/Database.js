'use strict';

// Including Lala's modules.
const Config = require('../Config/Config');
const Logger = require('../Logger/Logger');
const ConnectionFactoryHelper = require('./ConnectionFactoryHelper');
const ConnectionRepository = require('./ConnectionRepository');
const {
    InvalidArgumentException
} = require('../Exceptions');

let drivers = {
    mongodb: require('./drivers/MongoDriver')
};
let connections = {};

class Database {
    /**
     * Initializes the connections with the database according to connections defined in the loaded configuration file, this method is chainable.
     *
     * @return {Promise<Database>}
     *
     * @async
     */
    static async initFromConfig(){
        const connections = Config.getProperty('connections');
        if ( Array.isArray(connections) && connections.length !== 0 ){
            const length = connections.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( connections[i].driver === '' || typeof connections[i].driver !== 'string' || connections[i].name === '' || typeof connections[i].name !== 'string' ){
                    continue;
                }
                const driver = connections[i].driver;
                const name = connections[i].name;
                try{
                    // Generate and register the connection based on current configuration block.
                    await ConnectionFactoryHelper.createFromConfigBlock(driver, connections[i], name, true);
                    if ( connections[i].default === true ){
                        // Setting the created connection as the default connection for this driver.
                        ConnectionRepository.setDefault(driver, name);
                    }
                }catch(ex){
                    Logger.log('[Database]: Invalid configuration found for connection "' + name + '" (driver ' + driver + ')');
                }
            }
        }






        let entries = Config.getProperty('database');
        if ( entries === null || typeof entries !== 'object' ){
            return this;
        }
        for ( let name in entries ){
            if ( entries[name].driver !== '' && typeof entries[name].driver === 'string' ){



/*
                let connection = new Database(entries[name].driver);
                if ( entries[name].authentication !== null && typeof entries[name].authentication === 'object' ){
                    if ( entries[name].authentication.password !== '' && typeof entries[name].authentication.password === 'string' ){
                        if ( entries[name].driver === 'redis' ){
                            connection.setAuthentication(null, entries[name].authentication.password);
                        } else if ( entries[name].authentication.username !== '' && typeof entries[name].authentication.username === 'string' ){
                            connection.setAuthentication(entries[name].authentication.username);
                        }
                    }
                }
                if ( entries[name].hostname !== '' && typeof entries[name].hostname === 'string' ){
                    connection.setHostname(entries[name].hostname);
                }
                if ( entries[name].port !== null && isNaN(entries[name].port) && entries[name].port > 0 && entries[name].port <= 65535 ){
                    connection.setPort(Math.floor(entries[name].port));
                }
                if ( entries[name].database !== '' && typeof entries[name].database === 'string' ){
                    connection.setDatabase(entries[name].database);
                }
                await connection.connect();
                connections[name] = connection;
                */
            }
        }
        return this;
    }









    /**
     * Defines a new driver and its handler class.
     *
     * @param {string} name A string containing the name of the driver, for instance the DBMS name.
     * @param {object} handler An object representing the handler class.
     */
    static defineDriver(name, handler){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( handler === null || typeof handler !== 'object' ){
            throw new InvalidArgumentException('Invalid driver handler.', 2);
        }
        drivers[name] = handler;
    }

    /**
     * Checks if a driver is supported or has been declared (custom drivers).
     *
     * @param {string} driver A string containing the driver name.
     *
     * @return {boolean} If the given driver
     */
    static isSupportedDriver(driver){
        return typeof driver === 'string' && drivers.hasOwnProperty(driver) && drivers[driver] !== null && typeof drivers[driver] === 'object';
    }



    /**
     * Returns the connection matching the given name.
     *
     * @param {string} name A string containing the name of the connection to return.
     *
     * @return {Database} An instance of this class representing the connection found, if no connection were found null will be returned instead.
     */
    static getConnection(name){
        if ( name === '' || typeof(name) !== 'string' ){
            throw new InvalidArgumentException('Invalid connection name.', 1);
        }
        if ( typeof connections[name] !== 'object' ){
            throw new InvalidArgumentException('No such connection found.', 2);
        }
        return connections[name];
    }

    /**
     * Returns the system's connection, the one matching the name "system" in configuration file.
     *
     * @return {Database} An instance of this class representing system's connection, if no system connection were found, the main one will be returned instead.
     */
    static getSystemConnection(){
        let name = typeof connections.system === 'object' ? 'system' : ( typeof connections.main === 'object' ? 'main' : null );
        if ( name === null ){
            let connection = Object.values(connections)[0];
            return typeof connection === 'object' ? connection : null;
        }
        return connections[name];
    }

    /**
     * Returns the main connection, the one matching the name "main" in configuration file.
     *
     * @return {Database} An instance of this class representing the main connection, if no main connection were found, the fist connection found will be returned as alternative.
     */
    static getMainConnection(){
        if ( typeof connections.main !== 'object' ){
            let connection = Object.values(connections)[0];
            return typeof connection === 'object' ? connection : null;
        }
        return connections.main;
    }



    /**
     * The class constructor.
     *
     * @param {string} driver A string containing the name of the driver to use, for instance "mongodb".
     */
    constructor(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( Database.isSupportedDriver(driver) === false ){
            throw new InvalidArgumentException('Unsupported driver.', 2);
        }
        this.driver = driver;
        this.authentication = {};
        this.hostname = '127.0.0.1';
        this.port = null;
        this.database = '';
        this.connection = null;
    }

    /**
     * Returns the name of the driver in use.
     *
     * @return {string} A string containing the driver name.
     */
    getDriver(){
        return this.driver;
    }

    /**
     * Sets the authentication parameters to use in database connection, this method is chainable.
     *
     * @param {string|null} username A string containing the username, if the database doesn't require an username for authentication (for instance Redis), pass null.
     * @param {string} password A string containing the password.
     *
     * @return {Database}
     */
    setAuthentication(username, password){
        this.authentication = {
            username: username,
            password: password
        };
        return this;
    }

    /**
     * Sets the hostname where the database is running at, this method is chainable.
     *
     * @param {string} hostname A string containing the hostname, it can be a domain, a path to an UNIX socket or an IP address.
     *
     * @return {Database}
     */
    setHostname(hostname){
        this.hostname = hostname === '' || typeof hostname !== 'string' ? '127.0.0.1' : hostname;
        return this;
    }

    /**
     * Returns the hostname where the database is running at.
     *
     * @return {string} A string containing the hostname.
     */
    getHostname(){
        return this.hostname;
    }

    /**
     * Sets the port where the database is listening at, this method is chainable.
     *
     * @param {number} port An integer number greater than zero and lower or equal than 65535 representing the port number.
     *
     * @return {Database}
     *
     * @throws {InvalidArgumentException} If the given port number is not valid.
     */
    setPort(port){
        if ( port !== null && isNaN(port) === false ){
            if ( port <= 0 || port > 65535 ){
                throw new InvalidArgumentException('Invalid port number.', 1);
            }
        }
        this.port = port;
        return this;
    }

    /**
     * Returns the port where the database is listening at.
     *
     * @return {number} An integer number greater than zero and lower or equal than 65535 representing the port number.
     */
    getPort(){
        return this.port;
    }

    /**
     * Sets the name of the database where the data is stored in.
     *
     * @param {string} database A string representing the database name.
     *
     * @return {Database}
     *
     * @throws {InvalidArgumentException} If the given database name is not valid.
     */
    setDatabase(database){
        if ( database === '' || typeof database !== 'string' ){
            throw new InvalidArgumentException('Invalid database name.', 1);
        }
        this.database = database;
        return this;
    }

    /**
     * Returns the name of the database where the data is stored in.
     *
     * @return {string} A string representing the database name.
     */
    getDatabase(){
        return this.database;
    }

    /**
     * Connects the database that has been set up.
     *
     * @return {Promise<void>}
     *
     *
     */
    async connect(){
        switch ( this.driver ){
            case 'mongodb':{
                if ( typeof drivers.mongodb !== 'object' ){
                    drivers.mongodb = require('mongodb');
                }
                this.connection = await drivers.mongodb.MongoClient('mongodb://' + this.hostname + '/' + this.database, {
                    useNewUrlParser: true
                }).connect();
                this.connection = this.connection.db(this.database);
            }break;
            default:{
                //
            }break;
        }
    }

    getConnection(){
        return this.connection;
    }
}

module.exports = Database;
