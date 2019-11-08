'use strict';

// Including native modules.
const Serializer = require('./Serializer');

/**
 * Allows to serialize arbitrary data into buffers.
 */
class BufferSerializer extends Serializer {
    /**
     * Serializes some given data into a native buffer.
     *
     * @param {*} data Some arbitrary data to serialize.
     *
     * @returns {Promise<?Buffer>} A buffer object representing the serialized data.
     *
     * @async
     * @override
     */
    async serialize(data){
        if ( !Buffer.isBuffer(data) ){
            const serialization = await super.serialize(data);
            data = serialization === null ? null : Buffer.from(serialization);
        }
        return data;
    }
}

module.exports = BufferSerializer;
