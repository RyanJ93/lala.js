'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    NotCallableException,
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @typedef {Object} BaseDirectoryIndexerConfiguration An object containing all the properties supported by this class.
 */

/**
 * Standardizes the implementation of directory indexer.
 *
 * @abstract
 */
class BaseDirectoryIndexer {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {BaseDirectoryIndexerConfiguration} An object containing as key the property name and as value its default value.
     */
    static getDefaultConfiguration(){
        return {};
    }

    /**
     * The class constructor.
     *
     * @param {?BaseDirectoryIndexerConfiguration} [configuration=null] An object containing the values for class properties.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(configuration = null){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'BaseDirectoryIndexer' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {BaseDirectoryIndexerConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {BaseDirectoryIndexer}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        return this;
    }

    /**
     * Lists all the files contained in the given directory then returns an HTML view in order to display them.
     *
     * @param {string} path A string containing the path to the directory to list.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<View>} A view representing the HTML page used to display entries.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async index(path, request, response){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = BaseDirectoryIndexer;
