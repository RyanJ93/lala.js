'use strict';

// Including Lala's modules.
const Processor = require('./Processor');
const {
    InvalidArgumentException,
    RequestEntityTooLargeHTTPException,
    BadRequestHTTPException
} = require('../../Exceptions');

/**
 * @typedef {Object} InputProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {number} [maxInputLength=2097152] An integer number greater than zero representing the max allowed size (in bytes) for request data, by default, 2 mb.
 */

/**
 * Allows to process client provided data from network requests.
 */
class InputProcessor extends Processor {
    /**
     * Loads all data contained in the request sent by client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @return {Promise<string>} A string containing the request body loaded.
     *
     * @async
     */
    _loadRequestBody(request){
        return new Promise((resolve, reject) => {
            let rawBody = '', length = 0;
            request.on('data', (data) => {
                length += Buffer.byteLength(data);
                if ( length > this._maxInputLength ){
                    // Request body size has exceeded the maximum allowed size.
                    reject(new RequestEntityTooLargeHTTPException('Maximum input size exceeded.', 1));
                }
                rawBody += data.toString();
            });
            request.on('end', () => {
                resolve(rawBody);
            });
            request.on('error', (error) => {
                // An error occurred while loading request body, for instance, connection has fallen.
                reject(new BadRequestHTTPException('An error occurred while loading request body.', 2, error));
            });
        });
    }

    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {InputProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        return {
            maxInputLength: 2097152
        };
    }

    /**
     * The class constructor.
     *
     * @param {?InputProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {number} _maxInputLength An integer number greater than zero representing the max allowed size (in bytes) for request data, aka POST data.
         *
         * @protected
         */
        this._maxInputLength = 2097152;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {InputProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {InputProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        if ( configuration === null || typeof configuration !== 'object' ){
            throw new InvalidArgumentException('Invalid configuration object.', 1);
        }
        if ( configuration.hasOwnProperty('maxInputLength') && !isNaN(configuration.maxInputLength) && configuration.maxInputLength > 0 ){
            this._maxInputLength = configuration.maxInputLength;
        }
        return this;
    }

    /**
     * Processes given request in order to append request data to it.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     */
    async process(request, response){
        request.rawBody = await this._loadRequestBody(request);
    }
}

module.exports = InputProcessor;
