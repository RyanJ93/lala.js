'use strict';

const ConnectionFactory = require('./ConnectionFactory');
const SQLite3Connection = require('../connections/SQLite3Connection');
const {
    InvalidArgumentException
} = require('../../Exceptions');

class SQLite3ConnectionFactory extends ConnectionFactory {
    /**
     * Generates the connection object based on the given properties fetched from a configuration file.
     *
     * @param {object} block An object containing the connection properties.
     *
     * @returns {Promise<SQLite3Connection>} An instance of the class "SQLite3Connection" representing the connection with the SQLite3 database that has been generated.
     */
    static async createFromConfigBlock(block){
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
        // TODO: Add support for modes (readonly, write, create).
        return connection;
    }
}

module.exports = SQLite3ConnectionFactory;