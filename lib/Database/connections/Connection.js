'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException,
    NotCallableException,
    RuntimeException
} = require('../../Exceptions');

/* abstract */ class Connection {
    /**
     * The class constructor.
     *
     * @throws RuntimeException If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Connection' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
        this._options = {};
        this._connection = null;
        this._connected = false;
    }

    /**
     * Returns always false as this is a class representing a single connection, pretty stupid to be honest.
     *
     * @returns {boolean} Simply "false".
     */
    isCluster(){
        return false;
    }

    /**
     * Sets the additional options to use when instantiating the connection, this method is chainable.
     *
     * @param {object} options An object containing the custom options as key/value pairs.
     *
     * @returns {Connection}
     *
     * @throws InvalidArgumentException
     */
    setOptions(options){
        if ( options === null ){
            this._options = {};
            return this;
        }
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options object.', 1);
        }
        this._options = options;
        return this;
    }

    /**
     * Returns the additional options to use when instantiating the connection.
     *
     * @returns {object}An object containing the custom options as key/value pairs.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Returns the object that is used internally to represent and handle the connection.
     *
     * @returns {object|null} The connection object or null if no connection has been initialized.
     */
    getConnection(){
        return this._connection;
    }

    /**
     * Establishes a connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws NotCallableException If this method is called without been overridden and implemented.
     *
     * @async
     */
    async connect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Establishes a new connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws NotCallableException If this method is called without been overridden and implemented.
     *
     * @async
     */
    async reconnect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Closes the connection with the context, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws NotCallableException If this method is called without been overridden and implemented.
     *
     * @async
     */
    async disconnect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Connection;