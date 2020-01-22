'use strict';

// Including Lala's modules.
const Processor = require('../Processor');

/**
 * @typedef {Object} HTTPSessionProcessorConfiguration An object containing all the properties of this class that will be setup on class has been instanced.
 */

/**
 * Adds support for HTTP sessions.
 */
class HTTPSessionProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPCookieProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {};
    }

    /**
     * The class constructor.
     *
     * @param {HTTPSessionProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null) {
        super(configuration);

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPCookieProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPSessionProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        return this;
    }
}

module.exports = HTTPSessionProcessor;
