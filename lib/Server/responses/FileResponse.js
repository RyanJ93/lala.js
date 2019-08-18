'use strict';

// Including Lala's modules.
const Response = require('./Response');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 *
 */
class FileResponse extends Response {
    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the file to send as response to the client.
     * @param {?string} filename A string containing a custom file name that the downloaded file should be renamed to, by default the original file name is used.
     * @param {boolean} [forceDownload=true]
     */
    constructor(path, filename = null, forceDownload = true) {
        super();

        /**
         * @type {string} _path A string containing the path to the file to send to the client.
         *
         * @protected
         */
        this._path = path;

        /**
         * @type {?string} _filename A string containing a custom name
         *
         * @protected
         */
        this._filename = filename !== '' && typeof filename === 'string' ? filename : null;

        /**
         * @type {boolean} [_forceDownload=true]
         *
         * @protected
         */
        this._forceDownload = forceDownload !== false;
    }

    /**
     * Sends a file to the client
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     */
    async apply(request, response){
        response.setHeader('Content-Description', 'File Transfer');
        response.setHeader('Content-Type', 'application/octet-stream');
        response.setHeader('Content-Disposition', 'attachment');
        response.setHeader('Expires', '0');
    }
}

module.exports = FileResponse;
