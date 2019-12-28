'use strict';

// Including Lala's modules.
const View = require('../View/View');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Allows to serialize arbitrary data into strings.
 */
class Serializer {
    /**
     * Serializes a given primitive value into a string representation.
     *
     * @param {(boolean|number|bigint|string)} data The primitive value that will be serialized into a string.
     *
     * @returns {string} A string representing the serialized value.
     *
     * @protected
     */
    _processPrimitive(data){
        this._contentType = 'text/plain';
        return typeof data === 'string' ? data : data.toString();
    }

    /**
     * Serializes a given object into a string representation.
     *
     * @param {Object} obj The object to serialize.
     *
     * @returns {Promise<?string>} A string representing the serialized value or null if the given object cannot be serialized.
     *
     * @async
     * @protected
     */
    async _processObject(obj){
        let output = null;
        if ( obj instanceof View ){
            // Render the view and returns the compiled HTML content.
            output = await obj.render();
            this._contentType = 'text/html';
        }else{
            // Return a JSON representation of the object.
            output = JSON.stringify(obj);
            this._contentType = 'application/json';
        }
        return output;
    }

    /**
     * Executes a given callback function and then serializes the returned value.
     *
     * @param {function} callback The callback function to execute.
     *
     * @returns {Promise<?string>} A string representing the serialized value or null if no serializable value is found.
     *
     * @async
     * @protected
     */
    async _processCallback(callback){
        // Execute the function and then re-process its output.
        const data = await callback(...this._callbackParameters);
        // Process returned data in order to generate the final string representation.
        return await this._process(data);
    }

    /**
     * Serialized some given data into a string representation.
     *
     * @param {*} data Some arbitrary data to serialize.
     *
     * @returns {Promise<?string>} The string representation generated from the data serialization or null if given data cannot be serialized.
     *
     * @async
     * @protected
     */
    async _process(data){
        let output = this._contentType = null;
        if ( data !== null && typeof data !== 'undefined' ){
            switch ( typeof data ){
                case 'boolean':
                case 'number':
                case 'bigint':
                case 'string': {
                    output = this._processPrimitive(data);
                }break;
                case 'object': {
                    output = await this._processObject(data);
                }break;
                case 'function': {
                    output = await this._processCallback(data);
                }break;
            }
        }
        return output;
    }

    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {?string} [_mimeType] A string containing the MIME type according to last performed serialization.
         *
         * @protected
         */
        this._contentType = null;

        /**
         * @type {*[]} _callbackParameters An array containing the parameters to pass whenever serializing functions.
         *
         * @protected
         */
        this._callbackParameters = [];
    }

    /**
     * Sets the parameters to pass whenever serializing functions, this method is chainable.
     *
     * @param {?*[]} parameters An array containing the parameters, if set to null, no parameter will be passed.
     *
     * @returns {Serializer}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setCallbackParameters(parameters){
        if ( parameters !== null && !Array.isArray(parameters) ){
            throw new InvalidArgumentException('Invalid parameters.', 1);
        }
        this._callbackParameters = parameters === null ? [] : parameters;
        return this;
    }

    /**
     * Returns the parameters that have been defined and that will be passed whenever serializing functions.
     *
     * @returns {*[]} An array containing the parameters.
     */
    getCallbackParameters(){
        return this._callbackParameters;
    }

    /**
     * Returns the MIME type according to the serialization performed.
     *
     * @returns {?string} A string containing the MIME type identifier or null if no MIME type has been set.
     */
    getContentType(){
        return this._contentType;
    }

    /**
     * Serialized some given data into a string representation.
     *
     * @param {*} data Some arbitrary data to serialize.
     *
     * @returns {Promise<?string>} The string representation generated from the data serialization or null if given data cannot be serialized.
     *
     * @async
     */
    serialize(data){
        return this._process(data);
    }
}

module.exports = Serializer;
