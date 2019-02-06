'use strict';

// Including Lala's modules.
const {
    NotCallableException
} = require('../../Exceptions');

/* abstract */ class ConnectionFactory {
    /**
     * Generates a connection object from a given object obtained after configuration file parsing.
     *
     * @param {object} block An object containing the connection properties.
     *
     * @returns {Promise<Connection|ClusteredConnection>} An instance of the class that represents the connection according to the driver in use, the generated class must extend the "Connection" or the "ClusteredConnection" class.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    static async createFromConfigBlock(block){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = ConnectionFactory;