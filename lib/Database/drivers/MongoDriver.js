'use strict';

const mongodb = require('mongodb');

// Including Lala's modules.
const InvalidArgumentException = require('../../Exceptions/InvalidArgumentException');

class MongoDriver{
    /**
     * Generates a connection URL for MongoDB's client based on the given options.
     *
     * @param {object} options An object containing all the parameters for the database connection.
     *
     * @return {string} A string containing the generated connection URL.
     */
    static buildConnectionURL(options){
        //TODO: Add support for auth mechanism, auth source and ssl.
        if ( options === null || typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid connection parameters.', 1);
        }
        let url = '';
        // Check if more than one contact point has been passed.
        if ( Array.isArray(options.nodes) && options.nodes.length > 0 ){
            // Validate each host/port.
            url += options.nodes.map((node) => {
                if ( node !== null && typeof node === 'object' && node.host !== '' && typeof node.host === 'string' ){
                    if ( node.port === null || isNaN(node.port) || node.port <= 0 || node.port > 65535 ){
                        return node.host + ':27017';
                    }
                    return node.host + ':' + node.port.toString();
                }
            }).join(',');
        }else if ( options.host !== '' && typeof options.host === 'string' ){
            // Generate the connection URL for a single node.
            url = options.host + ':' + ( options.port !== null && !isNaN(options.port) && options.port > 0 && options.port <= 65535 ? options.port.toString() : ':27017' );
        }
        // If no database node has been defined, throw an exception.
        if ( url === '' ){
            throw new InvalidArgumentException('No host defined.', 2);
        }
        return 'mongodb://' + url;
    }

    /**
     * The class constructor.
     */
    constructor(){
        this.client = null;
        this.connection = null;
    }

    /**
     * Establishes a connection with the database.
     *
     * @param {object} options An object containing all the parameters for the database connection.
     *
     * @return {Promise<Db>}
     *
     * @async
     */
    async connect(options){
        if ( options === null || typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid connection parameters.', 1);
        }
        if ( options.database === '' || typeof options.database !== 'string' ){
            throw new InvalidArgumentException('Invalid database name.', 2);
        }
        // Connect to the MongoDB server(s) using the generated connection URL.
        this.client = await mongodb.connect(MongoDriver.buildConnectionURL(options));
        this.connection = this.client.db(options.database);
        return this.connection;
    }

    /**
     * Closes the connection to the database, this method is chainable.
     *
     * @return {MongoDriver}
     */
    disconnect(){
        // Close the current active client.
        this.client.close();
        this.client = null;
        this.connection = null;
        return this;
    }

    /**
     * Returns if a connection with the database has been established.
     *
     * @return {boolean} If a connection with the database has been established will be returned "true", otherwise "false".
     */
    isConnected(){
        return this.client !== null;
    }


}

module.exports = MongoDriver;
