'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const Connection = require('./connections/Connection');
const ClusteredConnection = require('./connections/ClusteredConnection');
const {
    InvalidArgumentException,
    MisconfigurationException
} = require('../Exceptions');

class ConnectionRepository extends Repository {
    /**
     * Generates the namespace based on the given driver name.
     *
     * @param {string} driver A string containing the name of the driver that will be validated and used in namespace generation.
     *
     * @returns {string} A string representing the generated namespace.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     *
     * @private
     */
    static _generateNamespace(driver){
        if ( driver === '' || typeof driver !== 'string' ){
            throw new InvalidArgumentException('Invalid driver name.', 5);
        }
        // TODO: Validate driver presence.
        return 'com.lala.database.connection.' + driver;
    }

    /**
     * Registers a new database connection.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection class.
     * @param {string} name A string containing the connection name, it must be unique.
     * @param {object} connection An instance of the class that implements the connection for the given driver, note that the class must extends the "Connection" class or the "ClusteredConnection" class.
     * @param {boolean} overwrite If set to "true" it means that if the connection has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid connection name is given.
     * @throws {InvalidArgumentException} If another connection with the same name has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid database connection class is given.
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     */
    static register(driver, name, connection, overwrite = false){
        if ( connection === null || typeof connection !== 'object' ){
            throw new InvalidArgumentException('Invalid database connection.', 4);
        }
        const parent = connection.prototype;
        if ( !parent instanceof Connection && !parent instanceof ClusteredConnection ){
            throw new InvalidArgumentException('Invalid database connection.', 4);
        }
        const namespace = ConnectionRepository._generateNamespace(driver);
        super.register(name, connection, namespace, overwrite);
    }

    /**
     * Removes a database connection that has been registered.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection.
     * @param {string} name A string containing the connection name.
     *
     * @throws {InvalidArgumentException} If an invalid connection name is given.
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     */
    static remove(driver, name){
        const namespace = ConnectionRepository._generateNamespace(driver);
        super.remove(name, namespace);
    }

    /**
     * Checks if a database connection matching a given name has been registered or not.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection.
     * @param {string} name A string containing the connection name.
     *
     * @returns {boolean} If the database connection exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid connection name is given.
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     */
    static has(driver, name){
        const namespace = ConnectionRepository._generateNamespace(driver);
        return super.has(name, namespace);
    }

    /**
     * Returns the database connection matching a given name.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection.
     * @param {string} name A string containing the connection name.
     *
     * @returns {object|null} An instance of the class that implements the connection for the given driver, if no connection object is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid connection name is given.
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     */
    static get(driver, name){
        const namespace = ConnectionRepository._generateNamespace(driver);
        return super.get(name, namespace);
    }

    /**
     * Returns all the database connections that have been registered.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection.
     *
     * @returns {{string: object}} An object having as key the object name and as value the database connection itself.
     *
     * @throws {InvalidArgumentException} If an invalid driver name is given.
     * @throws {InvalidArgumentException} If the given driver has not been registered.
     */
    static getAll(driver){
        const namespace = ConnectionRepository._generateNamespace(driver);
        return super.getAll(namespace);
    }

    /**
     * Sets the default connection to use with the given driver.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection.
     * @param {string} name A string containing the name of the connection to use, note that the given connection must have been registered first.
     */
    static setDefault(driver, name){
        const namespace = ConnectionRepository._generateNamespace(driver);
        super.setDefault(name, namespace);
    }

    /**
     * Returns the default connection to use with the given driver.
     *
     * @param {string} driver A string containing the name of the database driver used by the given connection.
     *
     * @returns
     */
    static getDefault(driver){
        const namespace = ConnectionRepository._generateNamespace(driver);
        try{
            return super.getDefault(namespace);
        }catch(ex){
            throw new MisconfigurationException('No default connection found.', 1);
        }
    }
}

module.exports = ConnectionRepository;