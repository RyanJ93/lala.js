'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Contains some utilities that can be useful whenever dealing with strings.
 */
class StringUtils {
    /**
     * Converts a given regex from string to a native RegExp object.
     *
     * @param {string} string A string containing the regex to convert.
     *
     * @returns {RegExp} The converted RegExp object.
     *
     * @throws {InvalidArgumentException} If an invalid string is given.
     * @throws {InvalidArgumentException} If an invalid regex representation is given.
     */
    static toRegExp(string){
        if ( string === '' || typeof string !== 'string' ){
            throw new InvalidArgumentException('Invalid string.', 1);
        }
        const components = string.match(new RegExp('^/(.*?)/([gimy]*)$'));
        if ( components === null ){
            throw new InvalidArgumentException('Invalid regex representation.', 2);
        }
        return new RegExp(components[1], components[2]);
    }
}

module.exports = StringUtils;
