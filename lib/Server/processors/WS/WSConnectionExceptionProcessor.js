'use strict';

// Including Lala's modules.
const Processor = require('../Processor');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @callback WSConnectionExceptionProcessorHandler The callback function that is invoked to handle an exception.
 *
 * @param {Error} exception An instance of the built-in class "Error" or a derived representing the exception occurred.
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
 *
 * @returns {Promise<string>}
 *
 * @async
 */

/**
 * @typedef {Object} WSConnectionExceptionProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, WSConnectionExceptionProcessorHandler>} handlers A map containing the handler functions to invoke according to the exception constructor name stored as entry key.
 */

/**
 * Allows to handle exception thrown during WebSocket client connection.
 */
class WSConnectionExceptionProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {WSConnectionExceptionProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            handlers: new Map()
        };
    }

    /**
     * Returns the exception handler function to use for the given exception.
     *
     * @param {Error} exception An instance of the built-in class "Error" or a derived representing the exception occurred.
     *
     * @returns {?WSMessageExceptionProcessorHandler} The callback function found or null if no handler function has been found for th given exception.
     *
     * @protected
     */
    _getHandler(exception){
        const name = exception.constructor.name;
        // Check if an handler has been defined for this exception.
        let handler = this._handlers.get(name);
        if ( typeof handler !== 'function' ){
            // If no handler has been defined for this exception, check is a default handler has been defined instead.
            handler = this._handlers.get('*');
        }
        return typeof handler === 'function' ? handler : null;
    }

    /**
     * The class constructor.
     *
     * @param {?WSConnectionExceptionProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration){
        super(configuration);

        /**
         * @type {Map<string, WSConnectionExceptionProcessorHandler>} _handlers A map containing the handler functions to invoke according to the exception constructor name stored as entry key.
         *
         * @protected
         */
        this._handlers = new Map();

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {WSConnectionExceptionProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {WSConnectionExceptionProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration) {
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('handlers') && configuration.handlers instanceof Map ){
            this._handlers = configuration.handlers;
        }
        return this;
    }

    /**
     * Handles the given exception.
     *
     * @param {Error} exception An instance of the built-in class "Error" or a derived representing the exception occurred.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async process(exception, request, socket){
        // TODO: Add exception reporting/logging.
        // Get the callback function to invoke to handle this exception based on its constructor name.
        const handler = this._getHandler(exception);
        // If no custom handler function has been found, return the complete stack trace, otherwise return the callback output.
        let output = handler === null ? exception.stack : await handler(exception, request, socket);
        if ( typeof output !== 'string' ){
            output = exception.stack;
        }
        // Close given client connection.
        socket.destroy(output);
    }
}

module.exports = WSConnectionExceptionProcessor;
