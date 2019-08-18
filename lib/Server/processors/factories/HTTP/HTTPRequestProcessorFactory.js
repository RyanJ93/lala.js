'use string';

// Including Lala's modules.
const RequestProcessorFactory = require('../RequestProcessorFactory');
const HTTPRequestProcessor = require('../../HTTP/HTTPRequestProcessor');

/**
 * Allows the generation and configuration of instances of the class "HTTPRequestProcessor" based on given configuration.
 */
class HTTPRequestProcessorFactory extends RequestProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = HTTPRequestProcessor.getDefaultConfiguration();
    }

    /**
     * Generates an instance of the class "HTTPRequestProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {RequestProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const requestProcessor = new HTTPRequestProcessor();
        // Configuring class instance.
        requestProcessor.configure(this._properties);
        return requestProcessor;
    }
}

module.exports = HTTPRequestProcessorFactory;
