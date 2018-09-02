'use strict';

const Config = require('../Config/Config');
const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');

let drivers = {};
let connections = {};
class Database{
    /**
     * Initializes the connections with the database according to connections defined in the loaded configuration file,m this method is chainable.
     *
     * @return {Database}
     */
    static async initFromConfig(){
        let entries = Config.getProperty('database');
        if ( entries === null || typeof entries !== 'object' ){
            return this;
        }
        for ( let name in entries ){
            if ( entries[name].driver !== '' && typeof entries[name].driver === 'string' ){
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
                if ( entries[name].port !== null && isNaN(entries[name].port) && entries[name].port > 0 && entries[name].port <= 25565 ){
                    connection.setPort(Math.floor(entries[name].port));
                }
                if ( entries[name].database !== '' && typeof entries[name].database === 'string' ){
                    connection.setDatabase(entries[name].database);
                }
                connection.connect();
                connections[name] = connection;
            }
        }
        return this;
    }

    /**
     * Returns the connection matching the given name.
     *
     * @param name
     *
     * @return {Database}
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

    static getSystemConnection(){
        let name = typeof connections.system === 'object' ? 'system' : ( typeof connections.main === 'object' ? 'main' : null );
        if ( name === null ){
            let connection = Object.values(connections)[0];
            return typeof connection === 'object' ? connection : null;
        }
        return connections[name];
    }

    static getMainConnection(){
        if ( typeof connections.main !== 'object' ){
            let connection = Object.values(connections)[0];
            return typeof connection === 'object' ? connection : null;
        }
        return connections.main;
    }

    constructor(driver){
        this.driver = driver;
        this.authentication = {};
        this.hostname = '127.0.0.1';
        this.port = null;
        this.database = '';
        this.connection = null;
    }

    setAuthentication(username, password){
        this.authentication = {
            username: username,
            password: password
        };
        return this;
    }

    setHostname(hostname){
        this.hostname = hostname;
        return this;
    }

    setPort(port){
        this.port = port;
        return this;
    }

    setDatabase(database){
        this.database = database;
        return this;
    }

    async connect(){
        switch ( this.driver ){
            case 'mongo':{
                if ( typeof drivers.mongodb !== 'object' ){
                    drivers.mongodb = require('mongodb');
                }
                this.connection = await drivers.mongodb.MongoClient('mongodb://' + this.hostname + '/' + this.database, {
                    useNewUrlParser: true
                });
            }break;
            default:{
                //
            }break;
        }
    }
}

module.exports = Database;
