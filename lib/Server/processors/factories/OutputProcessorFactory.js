'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const OutputProcessor = require('../OutputProcessor');
const Context = require('../../../Types/Context');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "OutputProcessor" based on given configuration.
 */
class OutputProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = OutputProcessor.getDefaultConfiguration();
    }

    /**
     * Sets if the client response can be compressed using the GZip algorithm, this method is chainable.
     *
     * @param {boolean} enable If set to "true", GZip will be added to the list of the available compression algorithms.
     *
     * @returns {OutputProcessorFactory}
     */
    setGZip(enable){
        this._properties.GZipCompressionEnabled = enable !== true;
        return this;
    }

    /**
     * Returns if the client response can be compressed using the GZip algorithm.
     *
     * @returns {boolean} If GZip compression has been enabled will be returned "true".
     */
    getGZip(){
        return this._properties.GZipCompressionEnabled !== false;
    }

    /**
     * Sets if the client response can be compressed using the Deflate algorithm, this method is chainable.
     *
     * @param {boolean} enable If set to "true", Deflate will be added to the list of the available compression algorithms.
     *
     * @returns {OutputProcessorFactory}
     */
    setDeflate(enable){
        this._properties.deflateCompressionEnabled = enable !== true;
        return this;
    }

    /**
     * Returns if the client response can be compressed using the Deflate algorithm.
     *
     * @return {boolean} If Deflate compression has been enabled will be returned "true".
     */
    getDeflate(){
        return this._properties.deflateCompressionEnabled !== false;
    }

    /**
     * Sets if the client response can be compressed using the Brotli algorithm, this method is chainable.
     *
     * @param enable If set to "true", Brotli will be added to the list of the available compression algorithms.
     *
     * @returns {OutputProcessorFactory}
     */
    setBrotli(enable){
        this._properties.BrotliCompressionEnabled = enable !== true;
        return this;
    }

    /**
     * Returns if the client response can be compressed using the Brotli algorithm.
     *
     * @return {boolean} If Brotli compression has been enabled will be returned "true".
     */
    getBrotli(){
        return this._properties.BrotliCompressionEnabled !== false;
    }

    /**
     * Sets if response stream data must be compressed before being sent back to the client, this method is chainable.
     *
     * @param {boolean} compression If set to "true" response stream will be compressed, otherwise not.
     *
     * @returns {OutputProcessorFactory}
     */
    setCompression(compression){
        this._properties.compression = compression !== false;
        return this;
    }

    /**
     * Returns if response stream is going to be compressed before being sent back to the client.
     *
     * @return {boolean} If compression has been enabled, "true" will be returned.
     */
    getCompression(){
        return this._properties.compression !== false;
    }

    /**
     * Sets the parameters of the client request being processed that will be passed to any callback function, if found as the data to process, this method is chainable.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {OutputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid object is given as request object.
     * @throws {InvalidArgumentException} If an invalid object is given as response object.
     */
    setContext(request, response){
        if ( request === null || typeof request !== 'object' ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        if ( response === null || typeof response !== 'object' ){
            throw new InvalidArgumentException('Invalid response object.', 2);
        }
        this._properties.context = new Context(request, response);
        return this;
    }

    /**
     * Returns client request parameters that have been defined.
     *
     * @returns {?Context} An object containing both the object representing the client request and response or null if no context has been defined.
     */
    getContext(){
        return this._properties.context;
    }

    /**
     * Returns the stream that represents current client request.
     *
     * @return {?http.IncomingMessage} An instance of the built-in class "IncomingMessage" containing all the connection properties.
     */
    getContextRequest(){
        return this._properties.context === null ? null : this._properties.context.getRequest();
    }

    /**
     * Returns the stream that represents client response associated to current client request.
     *
     * @return {?http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     */
    getContextResponse(){
        return this._properties.context === null ? null : this._properties.context.getResponse();
    }

    /**
     * Sets if identification headers such as the "X-Powered-By" header should be omitted the the client response or not, this method is chainable.
     *
     * @param {boolean} stealth If set to "true" identification headers will be omitted.
     *
     * @returns {OutputProcessorFactory}
     */
    setStealth(stealth){
        this._properties.stealth = stealth === true;
        return this;
    }

    /**
     * Returns if identification headers should be omitted in the client response.
     *
     * @returns {boolean} If identification headers should be omitted will be returned "true".
     */
    getStealth(){
        return this._properties.stealth === true;
    }

    /**
     * Adds a MIME type to the list of types to compress whenever served to a client, this method is chainable.
     *
     * @param {string} type A string containing the MIME type identifier to add.
     *
     * @returns {OutputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid MIME type identifier is given.
     */
    addCompressionType(type){
        if ( type === '' || typeof type !== 'string' ){
            throw new InvalidArgumentException('Invalid MIME type.', 1);
        }
        if ( this._properties.compressionTypes.indexOf(type) === -1 ){
            this._properties.compressionTypes.push(type);
        }
        return this;
    }

    /**
     * Removes a MIME type from the list of types to compress whenever served, this method is chainable.
     *
     * @param {string} type A string containing the MIME type identifier to remove.
     *
     * @returns {OutputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid MIME type identifier is given.
     */
    removeCompressionType(type){
        if ( type === '' || typeof type !== 'string' ){
            throw new InvalidArgumentException('Invalid MIME type.', 1);
        }
        const index = this._properties.compressionTypes.indexOf(type);
        if ( index >= 0 ){
            this._properties.compressionTypes.splice(index, 1);
        }
        return this;
    }

    /**
     * Sets the list of MIME types to compress whenever served, this method is chainable.
     *
     * @param {string[]} types An array of strings containing the MIME type identifiers.
     *
     * @returns {OutputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setCompressionTypes(types){
        if ( !Array.isArray(types) ){
            throw new InvalidArgumentException('Invalid MIME type array.', 1);
        }
        this._properties.compressionTypes = types;
        return this;
    }

    /**
     * Returns the list of MIME types to compress whenever served.
     *
     * @returns {string[]} An array of strings containing the MIME type identifiers.
     */
    getCompressionTypes(){
        return this._properties.compressionTypes;
    }

    /**
     * Sets the header managers to execute when building the client response, this method is chainable.
     *
     * @param {HeaderManager[]} headerManagers An array containing the header managers as instances of the manager class, which must extend the "HeaderManager" class.
     *
     * @returns {OutputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setHeaderManagers(headerManagers){
        if ( !Array.isArray(headerManagers) ){
            throw new InvalidArgumentException('Invalid header managers array.', 1);
        }
        this._properties.headerManagers = headerManagers;
        return this;
    }

    /**
     * Returns the header managers to execute when building the client response.
     *
     * @returns {HeaderManager[]} An array containing the header managers that have been defined.
     */
    getHeaderManagers(){
        return this._properties.headerManagers;
    }

    /**
     * Generates an instance of the class "AuthorizationProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {OutputProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const outputProcessor = new OutputProcessor();
        // Configuring class instance.
        outputProcessor.configure(this._properties);
        return outputProcessor;
    }
}

module.exports = OutputProcessorFactory;
