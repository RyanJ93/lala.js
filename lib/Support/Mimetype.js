'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const mimes = require('./mimes');
const mimeSignatureDefinitions = require('./mimeSignatureDefinitions');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * An helper class that allows to detect file mimetype based on a built-in list indexed by file extension.
 */
class Mimetype {
    /**
     * Detects the mimetype based on the file extension.
     *
     * @param {string} path A string containing the path to the file to analyze.
     *
     * @returns {(string|null)} A string containing the mimetype found or null if no mimetype has been found.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    static detect(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid file path.', 1);
        }
        // Get the file extension
        const extensionIndex = path.lastIndexOf('.');
        const extension = extensionIndex !== -1 ? path.substr(extensionIndex + 1).toLowerCase() : '';
        // Look up file mimetype based on the extension found (if found).
        return extension !== '' && mimes.hasOwnProperty(extension) ? mimes[extension] : null;
    }

    static detectFromSignature(path){
        const slice = filesystem.readFileSync(path);
        // TODO: Implement this method.
    }
}

module.exports = Mimetype;
