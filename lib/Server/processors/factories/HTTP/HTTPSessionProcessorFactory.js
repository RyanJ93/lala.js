'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const HTTPSessionProcessor = require('../../HTTP/HTTPSessionProcessor');

/**
 * Allows the generation and configuration of instances of the class "HTTPSessionProcessor" based on given configuration.
 */
class HTTPSessionProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        this._properties = HTTPSessionProcessor.getDefaultConfiguration();
    }

    /**
     * Generates an instance of the class "HTTPSessionProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {HTTPSessionProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const sessionProcessor = new HTTPSessionProcessor();
        // Configuring class instance.
        sessionProcessor.configure(this._properties);
        return sessionProcessor;
    }
}

module.exports = HTTPSessionProcessorFactory;
