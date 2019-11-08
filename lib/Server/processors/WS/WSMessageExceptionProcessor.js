'use strict';

// Including Lala's modules.
const Processor = require('../Processor');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @callback WSMessageExceptionProcessorHandler The callback function that is invoked to handle an exception.
 *
 * @param {Error} exception An instance of the built-in class "Error" or a derived representing the exception occurred.
 * @param {*} message The message that was originally going to be sent.
 * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
 *
 * @returns {Promise<void>}
 *
 * @async
 */

/**
 * @typedef {Object} WSMessageExceptionProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, WSMessageExceptionProcessorHandler>} handlers A map containing the handler functions to invoke according to the exception constructor name stored as entry key.
 */

/**
 * Allows to handle exception thrown during WebSocket messages processing.
 */
class WSMessageExceptionProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {WSMessageExceptionProcessorConfiguration} An object containing as key the property name and as value its default value.
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
     * @param {?WSMessageExceptionProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, WSMessageExceptionProcessorHandler>} _handlers A map containing the handler functions to invoke according to the exception constructor name stored as entry key.
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
     * @param {WSMessageExceptionProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {WSMessageExceptionProcessor}
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
     * @param {*} message The message that was originally going to be sent.
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async process(exception, message, connection){
        // TODO: Add exception reporting/logging.
        const handler = this._getHandler(exception);
        // Get the output from the handler function defined for this exception, if no handler has been defined, use the whole stack trace as message.
        const output = handler === null ? exception.stack : await handler(exception, message, connection);
        if ( output !== null && typeof output !== 'undefined' ){
            await (new Promise((resolve) => {
                // Get the function to use for sending, if defined, "rawSend" will represent a copy of the original send function, then it doesn't contain any other layer added by this framework.
                const sender = connection.hasOwnProperty('rawSend') && typeof connection.rawSend === 'function' ? connection.rawSend : connection.send;
                // Send the output as a message's response to the client.
                sender(output, {
                    binary: false
                }, () => {
                    resolve();
                });
            }));
        }
    }
}

module.exports = WSMessageExceptionProcessor;
