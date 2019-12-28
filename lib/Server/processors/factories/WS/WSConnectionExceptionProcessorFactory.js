'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const WSConnectionExceptionProcessor = require('../../WS/WSConnectionExceptionProcessor');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "WSConnectionExceptionProcessor" based on given configuration.
 */
class WSConnectionExceptionProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = WSConnectionExceptionProcessor.getDefaultConfiguration();
    }

    /**
     * Sets a custom handler for a given exception, this method is chainable.
     *
     * @param {?WSConnectionExceptionProcessorHandler} handler A callback function that will be invoked whenever the given exception occurs.
     * @param {?string} exception A string containing the name of the exception class to handle, if set to null, it will be used as default handler.
     *
     * @returns {WSConnectionExceptionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     * @throws {InvalidArgumentException} If an invalid exception class is given.
     */
    setHandler(handler, exception = null){
        if ( handler !== null && typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler function.', 1);
        }
        if ( exception === null ){
            exception = '*';
        }else if ( exception === '' || typeof exception !== 'string' ){
            throw new InvalidArgumentException('Invalid exception class name.', 2);
        }
        if ( handler === null ){
            this._properties.handlers.delete(exception);
        }else{
            this._properties.handlers.set(exception, handler);
        }
        return this;
    }

    /**
     * Returns the custom handler that has been defined for a given exception.
     *
     * @param {?string} exception A string containing the name of the exception class, if set to null, the default handler will be returned instead.
     *
     * @returns {?WSConnectionExceptionProcessorHandler} The callback function defined or null if no callback function has been defined.
     *
     * @throws {InvalidArgumentException} If an invalid exception class is given.
     */
    getHandler(exception = null){
        if ( exception === null ){
            exception = '*';
        }else if ( exception === '' || typeof exception !== 'string' ){
            throw new InvalidArgumentException('Invalid exception.', 1);
        }
        const handler = this._properties.handlers.get(exception);
        return typeof handler === 'undefined' ? null : handler;
    }

    /**
     * Generates an instance of the class "WSConnectionExceptionProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {WSConnectionExceptionProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const connectionExceptionProcessor = new WSConnectionExceptionProcessor();
        // Configuring class instance.
        connectionExceptionProcessor.configure(this._properties);
        return connectionExceptionProcessor;
    }
}

module.exports = WSConnectionExceptionProcessorFactory;
