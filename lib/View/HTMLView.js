'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const BaseView = require('./BaseView');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents a plain HTML view.
 */
class HTMLView extends BaseView {
    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the view file.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    constructor(path){
        super(path);
    }

    /**
     * Returns the contents of the HTML file defined as a readable stream.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A readable stream that returns the HTML code produced from the view.
     *
     * @async
     */
    async renderAsStream(){
        // Look up the view contents from the cache.
        let stream = await this._loadStreamFromCache(null);
        if ( stream === null ){
            // No cached data found, load contents from file.
            stream = await filesystem.createReadStream(this._path);
            // Save loaded data to the cache for next uses.
            this._storeStreamInCache(stream, null);
        }
        return stream;
    }

    /**
     * Returns the contents of the HTML file defined as a plain string.
     *
     * @returns {Promise<string>} A string containing the HTML code generated from the view.
     *
     * @async
     */
    async renderAsString(){
        // Look up the view contents from the cache.
        let contents = await this._loadStringFromCache(null);
        if ( contents === null ){
            // No cached data found, load contents from file.
            contents = await filesystem.promises.readFile(this._path);
            contents = contents.toString();
            // Save loaded data to the cache for next uses.
            this._storeStringInCache(contents, null);
        }
        return contents;
    }
}

module.exports = HTMLView;
