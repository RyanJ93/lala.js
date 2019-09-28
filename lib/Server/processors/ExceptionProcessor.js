'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @callback exceptionHandler The callback function invoked to lookup credentials from an unique user identifier.
 *
 * @param {Error} exception The exception to handle as an instance of a class extending the "Exception" class or the built-in "Error" class.
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 *
 * @returns {Promise<void>}
 *
 * @async
 */

/**
 * @typedef {Object} ExceptionProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, exceptionHandler>} exceptionHandlers A map containing all the custom exception handler and having as key the exception constructor name and as value the callback function to execute.
 * @property {?exceptionHandler} defaultExceptionHandler A callback function to execute to handle an exception whenever no dedicated handler function has been defined for its constructor name.
 */

/**
 * Handles uncaught exceptions thrown during request process.
 */
class ExceptionProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {ExceptionProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            exceptionHandlers: new Map(),
            defaultExceptionHandler: null
        };
    }

    /**
     * Returns the handler function to execute according to the given exception constructor name.
     *
     * @param {string} exception A string containing the name of the exception to handle.
     *
     * @returns {?exceptionHandler} The callback function to execute, if none is found, null will be returned instead.
     *
     * @protected
     */
    _getExceptionHandler(exception){
        let handler = this._defaultExceptionHandler;
        if ( this._exceptionHandlers.has(exception) ){
            handler = this._exceptionHandlers.get(exception);
        }
        return handler;
    }

    /**
     * The class constructor.
     *
     * @param {?ExceptionProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, exceptionHandler>} _exceptionHandlers A map containing all the custom exception handler functions defined.
         *
         * @private
         */
        this._exceptionHandlers = new Map();

        /**
         * @type {?exceptionHandler} _defaultExceptionHandler A function that is invoked whenever no handler has been defined for a particular exception.
         *
         * @protected
         */
        this._defaultExceptionHandler = null;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {ExceptionProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {ExceptionProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('exceptionHandlers') && configuration.exceptionHandlers instanceof Map ){
            this._exceptionHandlers = configuration.exceptionHandlers;
        }
        if ( configuration.hasOwnProperty('defaultExceptionHandler') && ( configuration.defaultExceptionHandler === null || typeof configuration.defaultExceptionHandler === 'function' ) ){
            this._defaultExceptionHandler = configuration.defaultExceptionHandler;
        }
        return this;
    }

    /**
     * Handles the given exception.
     *
     * @param {Error} exception An instance of the class "Error" or a derived class representing the exception to handle.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<*>} An error representation that can be sent to the client.
     *
     * @async
     * @override
     */
    async process(exception, request, response){
        // TODO: Add exception reporting/logging.
        // Get the callback function to execute based on given exception's constructor.
        const callback = this._getExceptionHandler(exception.constructor.name);
        let output = null;
        if ( callback !== null ){
            output = await callback(exception, request, response);
        }
        return output;
    }
}

module.exports = ExceptionProcessor;
