'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including Lala's modules.
const StreamSerializer = require('../../Support/StreamSerializer');
const BaseView = require('../../View/BaseView');
const ParametrizedView = require('../../View/ParametrizedView');
const ParametrizedViewFactory = require('../../View/ParametrizedViewFactory');
const Context = require('../../Types/Context');
const Response = require('../responses/Response');
const ResponseProperties = require('../support/ResponseProperties');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Allows to serialize arbitrary data into streams taking care of given HTTP request context.
 */
class HTTPSerializer extends StreamSerializer {
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
        data = super._processPrimitive(data);
        const contentLength = Buffer.byteLength(data, 'utf-8');
        this._responseProperties.setMIMEType('text/plain').setCharset('UTF-8').setContentLength(contentLength);
        return data;
    }

    /**
     * Serializes a given object.
     *
     * @param {Object} obj Some custom object to serialize.
     *
     * @returns {Promise<?(module:stream.internal.Readable|module:stream.internal.Readable[])>}
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
            const request = this._context.getRequest();
            const response = this._context.getResponse();
            // Check if the requested resource should be sent to the client or not (for instance because the client owns the most recent version in its cache already).
            const processable = await obj.prepare(request, response);
            this._responseProperties = obj.getResponseProperties();
            if ( processable === true ){
                const data = output = await obj.apply(request, response);
                if ( output !== null && !( output instanceof Readable ) && !Array.isArray(output) ){
                    // Process output from response object in order to convert it into a readable stream.
                    output = await this._process(data);
                }
            }
        }else if ( obj instanceof ParametrizedView ){
            // Bind current request context, render the view and returns the compiled HTML content.
            output = await obj.setContext(this._context).renderAsStream();
            this._responseProperties.setMIMEType('text/html').setCharset('UTF-8');
        }else if ( obj instanceof BaseView ){
            // Render the view and returns the compiled HTML content.
            output = await obj.renderAsStream();
            this._responseProperties.setMIMEType('text/html').setCharset('UTF-8');
        }else if ( obj instanceof ParametrizedViewFactory ){
            // Generate an instance of the view from its factory object.
            const view = obj.craft(null, this._context);
            // Render the view and returns the compiled HTML content.
            output = await view.renderAsStream();
            this._responseProperties.setMIMEType('text/html').setCharset('UTF-8');
        }else if ( obj instanceof Readable ){
            output = obj;
        }else{
            // Return a JSON representation of the object.
            output = JSON.stringify(obj);
            const contentLength = Buffer.byteLength(output, 'utf-8');
            this._responseProperties.setMIMEType('application/json').setCharset('UTF-8').setContentLength(contentLength);
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

        /**
         * @type {ResponseProperties} _responseProperties Contains some properties to declare to the client as a set of HTTP headers according to processed input.
         *
         * @protected
         */
        this._responseProperties = new ResponseProperties();
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
     * Returns the properties to declare to the client as a set of HTTP headers.
     *
     * @return {ResponseProperties} An instance of the class "ResponseProperties" containing these properties.
     */
    getResponseProperties(){
        return this._responseProperties;
    }

    /**
     * Serializes some given data into a native buffer.
     *
     * @param {*} data Some arbitrary data to serialize.
     *
     * @returns {Promise<?module:stream.internal.Readable[]>} An array containing the streams to serve represented as readable streams.
     *
     * @async
     * @override
     */
    async serialize(data) {
        if ( !( data instanceof Readable ) ){
            const serializedData = await super._process(data);
            if ( serializedData === null ){
                data = null;
            }else if ( serializedData instanceof Readable ){
                data = [serializedData];
            }else if ( Array.isArray(serializedData) ){
                data = serializedData;
            }else{
                // Generate the stream object.
                const stream = new Readable();
                stream.push(serializedData);
                // Close the stream.
                stream.push(null);
                data = [stream];
            }
        }
        return data;
    }
}

module.exports = HTTPSerializer;
