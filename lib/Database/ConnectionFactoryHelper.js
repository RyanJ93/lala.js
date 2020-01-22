'use strict';

// Including Lala's modules.
const ConnectionFactoryRepository = require('./ConnectionFactoryRepository');
const ConnectionRepository = require('./ConnectionRepository');
const Connection = require('./connections/Connection');
const ClusteredConnection = require('./connections/ClusteredConnection');
const {
    InvalidArgumentException,
    MisconfigurationException,
    RuntimeException
} = require('../Exceptions');

/**
 * The helper class that allows to easily create connection instances given the registered driver name and the connection parameters.
 */
class ConnectionFactoryHelper {
    /**
     * Generates a an object representing the connection based on the properties obtained from a configuration file.
     *
     * @param {string} driver A string containing the name of the driver that will handle the connection generation.
     * @param {{string: *}} block An object containing the connection properties.
     * @param {(string|null)} [name=null] A string containing an unique name of the generated connection, if given, the generated connection will be registered globally.
     * @param {boolean} [overwrite=false] If the generated connection is going to be registered globally and if the given name is taken, setting it to "true" will allow the old connection to be overwritten by this one.
     *
     * @returns {Promise<Connection|ClusteredConnection>} An instance of the class that represents the connection according to the driver in use, the generated class must extend the "Connection" or the "ClusteredConnection" class.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If an invalid configuration block is given.
     * @throws {MisconfigurationException} If the given driver name was not found within the available connection factory registry.
     * @throws {RuntimeException} If the connection object generated doesn't extend the "Connection" or the "ClusteredConnection" class.
     *
     * @async
     */
    static async createFromConfigBlock(driver, block, name = null, overwrite = false){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 1);
        }
        if ( block === null || typeof block !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration block.', 2);
        }
        // Get the driver that will generate the connection according to its requirements.
        const factory = ConnectionFactoryRepository.get(driver);
        if ( factory === null ){
            throw new MisconfigurationException('The given driver was not registered.', 3);
        }
        // Generate the connection object.
        const connection = await factory.createFromConfigBlock(block);
        const parent = connection.prototype;
        // Check if the generated connection object extends the required classes.
        if ( !parent instanceof Connection && !parent instanceof ClusteredConnection ){
            throw new RuntimeException('Invalid database connection class.', 4);
        }
        if ( name !== '' && typeof name === 'string' ){
            // Register the generated connection globally according to the given name.
            ConnectionRepository.register(driver, name, connection, overwrite);
        }
        return connection;
    }
}

module.exports = ConnectionFactoryHelper;