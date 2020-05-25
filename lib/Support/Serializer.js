'use strict';

// Including Lala's modules.
const BaseView = require('../View/BaseView');
const BaseViewFactory = require('../View/BaseViewFactory');
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
        if ( typeof data !== 'string' ){
            data = data.toString();
        }
        return data;
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
        let output;
        if ( obj instanceof BaseView ){
            // Render the view and returns the compiled HTML content.
            output = await obj.renderAsStream();
        }else if ( obj instanceof BaseViewFactory ){
            // Generate an instance of the view from its factory object.
            const view = obj.craft(null, null);
            // Render the view and returns the compiled HTML content.
            output = await view.renderAsStream();
        }else{
            // Return a JSON representation of the object.
            output = JSON.stringify(obj);
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
        let output = null;
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
