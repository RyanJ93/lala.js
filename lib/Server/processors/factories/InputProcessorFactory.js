'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const InputProcessor = require('../InputProcessor');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "InputProcessor" based on given configuration.
 */
class InputProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = InputProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the maximum allowed size for data from client requests, this method is chainable.
     *
     * @param length An integer number greater than zero representing the size in bytes.
     *
     * @return {InputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid number is given as maximum data length value.
     */
    setMaxInputLength(length){
        if ( length === null || isNaN(length) || length <= 0 ){
            throw new InvalidArgumentException('Invalid length.', 1);
        }
        this._properties.maxInputLength = length;
        return this;
    }

    /**
     * Returns the maximum allowed size for data from client request.
     *
     * @return {number} An integer number representing the maximum allowed size in bytes, by default 2097152 bytes (2 Mb).
     */
    getMaxInputLength(){
        return this._properties.maxInputLength;
    }

    /**
     * Generates an instance of the class "InputProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {InputProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const inputProcessor = new InputProcessor();
        // Configuring class instance.
        inputProcessor.configure(this._properties);
        return inputProcessor;
    }
}

module.exports = InputProcessorFactory;
