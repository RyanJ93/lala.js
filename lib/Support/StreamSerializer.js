'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including native modules.
const Serializer = require('./Serializer');

/**
 * Allows to serialize arbitrary data into streams.
 */
class StreamSerializer extends Serializer {
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
    async serialize(data){
        if ( !( data instanceof Readable ) ){
            const serialization = await super.serialize(data);
            // Generate the stream object.
            data = new Readable();
            data.push(serialization);
            // Close the stream.
            data.push(null);
        }
        return data;
    }
}

module.exports = StreamSerializer;
