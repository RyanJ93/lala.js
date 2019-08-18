'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const HTTPCookieProcessor = require('../../HTTP/HTTPCookieProcessor');

/**
 * Allows the generation and configuration of instances of the class "HTTPCookieProcessor" based on given configuration.
 */
class HTTPCookieProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        this._properties = HTTPCookieProcessor.getDefaultConfiguration();
    }

    /**
     * Generates an instance of the class "HTTPCookieProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {HTTPCookieProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const cookieProcessor = new HTTPCookieProcessor();
        // Configuring class instance.
        cookieProcessor.configure(this._properties);
        return cookieProcessor;
    }
}

module.exports = HTTPCookieProcessorFactory;
