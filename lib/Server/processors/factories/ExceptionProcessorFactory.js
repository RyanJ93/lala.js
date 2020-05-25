'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const ExceptionProcessor = require('../ExceptionProcessor');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "ExceptionProcessor" based on given configuration.
 */
class ExceptionProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = ExceptionProcessor.getDefaultConfiguration();
    }

    /**
     * Adds a custom handler for a given exception, this method is chainable.
     *
     * @param {string} name A string representing the name of the exception that will be handled.
     * @param {exceptionHandler} handler A callback function that will be triggered whenever this exception occurs.
     *
     * @returns {ExceptionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid exception name is given.
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    addExceptionHandler(name, handler){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid exception name.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler function.', 2);
        }
        this._properties.exceptionHandlers.set(name, handler);
        return this;
    }

    /**
     * Removes a defined exception handler, this method is chainable.
     *
     * {string} name A string representing the exception name.
     *
     * @returns {ExceptionProcessorFactory}
     */
    removeExceptionHandler(name){
        this._properties.exceptionHandlers.delete(name);
        return this;
    }

    /**
     * Sets the exception handler for the given specific exception constructor names, this method is chainable.
     *
     * @param {Map<string, exceptionHandler>} handlers A map having as key the exception constructor name and as value the callback function to invoke.
     *
     * @returns {ExceptionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid map is given.
     */
    setExceptionHandlers(handlers){
        if ( !( handlers instanceof Map ) ){
            throw new InvalidArgumentException('Invalid handlers object.', 1);
        }
        this._properties.exceptionHandlers = handlers;
        return this;
    }

    /**
     * Sets the function to invoke to handle those exception for which no custom handler has been defined, this method is chainable.
     *
     * @param {?exceptionHandler} handler The handler function to invoke, if set to null, the internal handler will be used instead.
     *
     * @returns {ExceptionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid function is given.
     */
    setDefaultExceptionHandler(handler){
        if ( handler !== null && typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler function.', 1);
        }
        this._properties.defaultExceptionHandler = handler;
        return this;
    }

    /**
     * Returns the function to invoke to handle those exception for which no custom handler has been defined.
     *
     * @returns {?exceptionHandler} The handler function defined or null if no function has been defined.
     */
    getDefaultExceptionHandler(){
        return this._properties.defaultExceptionHandler;
    }

    /**
     * Generates an instance of the class "ExceptionProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {ExceptionProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const exceptionProcessor = new ExceptionProcessor();
        // Configuring class instance.
        exceptionProcessor.configure(this._properties);
        return exceptionProcessor;
    }
}

module.exports = ExceptionProcessorFactory;
