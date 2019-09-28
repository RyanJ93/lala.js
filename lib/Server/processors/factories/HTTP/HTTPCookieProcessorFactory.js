'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const HTTPCookieProcessor = require('../../HTTP/HTTPCookieProcessor');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

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
     * Sets the name of the cookie that should contain the language to use for current client request, this method is chainable.
     *
     * @param name A string containing the name of the cookie or null if language should not be changes by cookies.
     *
     * @returns {HTTPCookieProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid cookie name is given.
     */
    setLanguageCookieName(name){
        if ( name !== null && typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid cookie name.', 1);
        }
        this._properties.languageCookieName = name === '' ? null : name;
        return this;
    }

    /**
     * Returns the name of the cookie that should contain the language to use for current client request.
     *
     * @returns {?string} A string containing the name of the cookie or null if no cookie name has been defined.
     */
    getLanguageCookieName(){
        return this._properties.languageCookieName;
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
