'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const RequestProcessor = require('../RequestProcessor');

/**
 * Allows the generation and configuration of instances of the class "RequestProcessor" based on given configuration.
 */
class RequestProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = RequestProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the maximum allowed length for request URLs, this method is chainable.
     *
     * @param {number} length An integer number greater than zero representing the length in characters.
     *
     * @return {RequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid length value is given.
     */
    setMaxURLLength(length){
        if ( length === null || isNaN(length) || length <= 0 ){
            throw new InvalidArgumentException('Invalid maximum URL length.', 1);
        }
        this._properties.maxURLLength = length;
        return this;
    }

    /**
     * Returns the maximum allowed length for request URLs.
     *
     * @return {number} An integer number greater than zero representing the length in characters, by default 8192.
     */
    getaAxURLLength(){
        return this._properties.maxURLLength;
    }

    /**
     * Generates an instance of the class "RequestProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {RequestProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const requestProcessor = new RequestProcessor();
        // Configuring class instance.
        requestProcessor.configure(this._properties);
        return requestProcessor;
    }
}

module.exports = RequestProcessorFactory;
