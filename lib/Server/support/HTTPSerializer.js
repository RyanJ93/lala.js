'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including Lala's modules.
const StreamSerializer = require('../../Support/StreamSerializer');
const Context = require('../../Types/Context');
const Response = require('../responses/Response');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Allows to serialize arbitrary data into streams taking care of given HTTP request context.
 */
class HTTPSerializer extends StreamSerializer {
    /**
     * Serializes a given object.
     *
     * @param {Object} obj Some custom object to serialize.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A stream representing the serialized data.
     *
     * @async
     * @override
     * @protected
     */
    async _processObject(obj){
        let output = null;
        if ( obj instanceof Response ){
            // Applies patches from the returned response according to its implementation.
            if ( this._context === null ){
                throw new RuntimeException('Unable to apply the response object as no context has been defined.', 1);
            }
            const data = output = await obj.apply(this._context.getRequest(), this._context.getResponse());
            if ( output !== null && !( output instanceof Readable ) ){
                // Process output from response object in order to convert it into a readable stream.
                output = await this._process(data);
            }
        }else if ( obj instanceof Readable ){
            output = obj;
        }else{
            output = await super._processObject(obj);
        }
        return output;
    }

    /**
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {?Context} [_context] An instance of the class "Context" containing both the request and response streams from the HTTP request being handled.
         *
         * @protected
         */
        this._context = null;
    }

    /**
     * Sets the current HTTP request's request and response streams, this method is chainable.
     *
     * @param {?Context} context An instance of the class "Context" representing current request context.
     *
     * @returns {HTTPSerializer}
     *
     * @throws {InvalidArgumentException} If an invalid request context is given.
     */
    setContext(context){
        if ( context !== null && !( context instanceof Context ) ){
            throw new InvalidArgumentException('Invalid context.', 1);
        }
        this._context = context;
        return this;
    }

    /**
     * Sets the current HTTP request's request and response streams that have been defined.
     *
     * @returns {?Context} An instance of the class "Context" representing the request context defined.
     */
    getContext(){
        return this._context;
    }

    /**
     * Serializes some given data into a native buffer.
     *
     * @param {*} data Some arbitrary data to serialize.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A stream representing the serialized data.
     *
     * @async
     * @override
     */
    async serialize(data) {
        if ( !( data instanceof Readable ) ){
            const serialization = await super._process(data);
            if ( serialization instanceof Readable ){
                data = serialization;
            }else{
                // Generate the stream object.
                data = new Readable();
                data.push(serialization);
                // Close the stream.
                data.push(null);
            }
        }
        return data;
    }
}

module.exports = HTTPSerializer;
