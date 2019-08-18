'use strict';

// Including native modules.
const http = require('http');

// Including Lala's modules.
const Processor = require('./Processor');
const {
    InvalidArgumentException,
    URITooLongHTTPException
} = require('../../Exceptions');
const { generateUUID } = require('../../helpers');

/**
 * @typedef RequestProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {number} [maxURLLength=8192] An integer number representing the maximum allowed size for request URLs in characters.
 */

/**
 * Processes client request handling client provided input data.
 */
class RequestProcessor extends Processor {
    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {RequestProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            maxURLLength: 8192
        };
    }

    /**
     * The class constructor.
     *
     * @param {?RequestProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {number} [_maxURLLength=8192] An integer number representing the maximum allowed size for request URLs in characters.
         *
         * @protected
         */
        this._maxURLLength = 8192;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {RequestProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {RequestProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('maxURLLength') && !isNaN(configuration.maxURLLength) && configuration.maxURLLength > 0 ){
            this._maxURLLength = configuration.maxURLLength;
        }
        return this;
    }

    /**
     * Processes client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async process(request, response){
        if ( Buffer.byteLength(request.url) > this._maxURLLength ){
            throw new URITooLongHTTPException('Client provided URL exceeded the allowed size.', 1);
        }
        request.id = generateUUID(4, false);
        request.processedByLala = true;
    }
}

module.exports = RequestProcessor;
