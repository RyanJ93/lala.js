'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const {
    InvalidArgumentException,
    NotCallableException,
    RuntimeException
} = require('../../Exceptions');

/**
 * The base class used to create classes to represent a connection to an external provider.
 *
 * @abstract
 */
/* abstract */ class Connection extends EventEmitter {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Connection' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {{string: *}} _options An object containing the additional custom options that the connection object that extends this class must take care of.
         *
         * @private
         */
        this._options = {};

        /**
         * @type {*|null} _connection The connection to the external service, according to the required driver or third part module.
         *
         * @private
         */
        this._connection = null;

        // Make this property more private: I need to know when this primitive value changes in order to emit an event, sorry JavaScript-san.
        this.__connected = false;
    }

    /**
     * Sets the value for property "__connected", namely "_connected", emitting the change event.
     *
     * @param {boolean} value A boolean value representing the current state of the connection.
     *
     * @private
     */
    set _connected(value){
        value = value === true;
        if ( this.__connected !== value ){
            this.emit('connectionStateChanged', value);
        }
        this.__connected = value;
    }

    /**
     * Returns the value for property "__connected", namely "_connected".
     *
     * @returns {boolean} A boolean value representing the current state of the connection.
     *
     * @private
     */
    get _connected(){
        return this.__connected;
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
     * @param {({string: *}|null)} options An object containing the custom options as key/value pairs, if set to null, all the custom options will be dropped.
     *
     * @returns {Connection}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
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
     * @returns {({string: *}|null)} An object containing the custom options as key/value pairs.
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
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
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
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
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
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async disconnect(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Connection;