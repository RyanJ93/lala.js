'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const ConnectionFactory = require('./factories/ConnectionFactory');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Contains all the classes that can be used to generate connection object for a specific driver.
 */
class ConnectionFactoryRepository extends Repository {
    /**
     * Registers a new connection factory class.
     *
     * @param {string} name A string containing the factory name, it must be unique.
     * @param {function} factory The connection factory class, it must extend the "ConnectionFactory" class.
     * @param {boolean} [overwrite=false]  If set to "true" it means that if the factory has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid factory name is given.
     * @throws {InvalidArgumentException} If another factory with the same name has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid connection factory class is given.
     */
    static register(name, factory, overwrite = false){
        if ( typeof factory !== 'function' || Object.getPrototypeOf(factory) !== ConnectionFactory ){
            throw new InvalidArgumentException('Invalid database connection class.', 4);
        }
        super.register(name, factory, 'com.lala.database.connection.factory', overwrite);
    }

    /**
     * Removes a connection factory class that has been registered.
     *
     * @param {string} name A string containing the factory name.
     *
     * @throws {InvalidArgumentException} If an invalid factory name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.database.connection.factory');
    }

    /**
     * Checks if a connection factory class matching a given name has been registered or not.
     *
     * @param {string} name A string containing the factory name.
     *
     * @returns {boolean} If the connection factory class exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid factory name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.database.connection.factory');
    }

    /**
     * Returns the connection factory class matching a given name.
     *
     * @param {string} name A string containing the factory name.
     *
     * @returns {(function|null)} The connection factory class matching the given name, if no factory is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid factory name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.database.connection.factory');
    }

    /**
     * Returns all the connection factory classes that have been registered.
     *
     * @returns {{string: object}} An object having as key the class name and as value the connection factory class itself.
     */
    static getAll(){
        return super.getAll('com.lala.database.connection.factory');
    }
}

module.exports = ConnectionFactoryRepository;