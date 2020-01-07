'use strict';


const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 *
 */
class BufferUtils {
    /**
     * Splits the given buffer into multiple buffers according the given separator.
     *
     * @param {Buffer} buffer The buffer to split.
     * @param {Buffer|string} separator A buffer representing the separator to use in buffer splitting, alternatively a string is accepted too.
     *
     * @return {Buffer[]} An array containing the parts the original buffer is split into.
     *
     * @throws {InvalidArgumentException} If an invalid buffer is given.
     * @throws {InvalidArgumentException} If an invalid separator is given.
     */
    static split(buffer, separator){
        if ( !( buffer instanceof Buffer ) ){
            throw new InvalidArgumentException('Invalid buffer.', 1);
        }
        if ( !( separator instanceof Buffer ) && typeof separator !== 'string' ){
            throw new InvalidArgumentException('Invalid separator.', 2);
        }
        let parts = [], index;
        const separatorLength = separator.length;
        if ( separatorLength !== 0 ){
            //
            while ( ( index = buffer.indexOf(separator) ) !== -1 ){
                const part = buffer.slice(0, index);
                buffer = buffer.slice(index + separatorLength);
                parts.push(part);
            }
        }
        parts.push(buffer);
        return parts;
    }
}

module.exports = BufferUtils;
