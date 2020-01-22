'use string';

// Including Lala's modules.
const RequestProcessorFactory = require('../RequestProcessorFactory');
const HTTPRequestProcessor = require('../../HTTP/HTTPRequestProcessor');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

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
     * Sets if HTTP method can be overridden according to a given parameter contained in client request, this method si chainable.
     *
     * @param {boolean} allowMethodOverride If set to "true" requests HTTP method can be overridden.
     *
     * @returns {HTTPRequestProcessorFactory}
     */
    setAllowMethodOverride(allowMethodOverride){
        this._properties.allowMethodOverride = allowMethodOverride === true;
        return this;
    }

    /**
     * Returns if HTTP method can be overridden by requests.
     *
     * @returns {boolean} If HTTP method can be overridden will be returned "true".
     */
    getAllowMethodOverride(){
        return this._properties.allowMethodOverride === true;
    }

    /**
     * Sets the name of the parameter that could contain the name of the HTTP method to set for the client request, this method is chainable.
     *
     * @param {string} methodOverrideParamName A string containing the name of the GET/POST parameter.
     *
     * @returns {HTTPRequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    setMethodOverrideParamName(methodOverrideParamName){
        if ( methodOverrideParamName === '' || typeof methodOverrideParamName !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        this._properties.methodOverrideParamName = methodOverrideParamName;
        return this;
    }

    /**
     * Returns the name of the parameter that could contain the name of the HTTP method to set for the client request.
     *
     * @returns {string} A string containing the parameter name.
     */
    getMethodOverrideParamName(){
        return this._properties.methodOverrideParamName;
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
