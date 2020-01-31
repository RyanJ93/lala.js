'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const Response = require('./Response');
const Logger = require('../../Logger');
const Mimetype = require('../../Support/Mimetype');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Represents a file download response.
 */
class FileResponse extends Response {
    /**
     * Deletes the fil that has been defined.
     *
     * @protected
     */
    async _removeOriginalFile(){
        if ( filesystem.existsSync(this._path) ){
            await filesystem.promises.unlink(this._path);
            this.emit('removed');
        }
    }

    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the file to send as response to the client.
     * @param {?string} filename A string containing a custom file name that the downloaded file should be renamed to, by default the original file name is used.
     * @param {boolean} [forceDownload=true] If set to "true", client will be forced to download and save this file.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    constructor(path, filename = null, forceDownload = true) {
        super();

        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid file path.', 1);
        }

        /**
         * @type {string} _path A string containing the path to the file to send to the client.
         *
         * @protected
         */
        this._path = path;

        /**
         * @type {?string} _filename A string containing a custom name the downloaded file will be renamed to.
         *
         * @protected
         */
        this._filename = filename !== '' && typeof filename === 'string' ? filename : null;

        /**
         * @type {boolean} [_forceDownload=true] If set to "true", client will be forced to download and save this file.
         *
         * @protected
         */
        this._forceDownload = forceDownload !== false;

        /**
         * @type {boolean} [_deleteOnceDownloaded] If set to "true" this file will be removed once client will have successfully downloaded it.
         *
         * @protected
         */
        this._deleteOnceDownloaded = false;
    }

    /**
     * Returns the path to the file defined.
     *
     * @returns {string} A string representing the path to the file.
     */
    getPath(){
        return this._path;
    }

    /**
     * Returns the name that this file should be renamed in once downloaded.
     *
     * @returns {?string} A string containing the filename or null if this file should not be renamed.
     */
    getFilename(){
        return this._filename;
    }

    /**
     * Returns if this file should be downloaded and saved or if client can chose the proper action to handle it.
     *
     * @returns {boolean} If download is going to be forced will be returned "true".
     */
    getForceDownload(){
        return this._forceDownload !== false;
    }

    /**
     * Returns if this file should be removed after download or not.
     *
     * @returns {boolean} If file should be removed will be returned "true".
     */
    getDeleteOnceDownloaded(){
        return this._deleteOnceDownloaded === true;
    }

    /**
     * Turns on file deletion once download has completed, this method is chainable.
     *
     * @returns {FileResponse}
     */
    deleteOnceDownloaded(){
        this._deleteOnceDownloaded = true;
        return this;
    }

    /**
     * Sends a file to the client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     */
     apply(request, response){
        return new Promise((resolve, reject) => {
            if ( this._forceDownload === true ){
                response.setHeader('Content-Description', 'File Transfer');
                response.setHeader('Content-Type', 'application/octet-stream');
                response.setHeader('Content-Disposition', 'attachment');
                response.setHeader('Expires', '0');
            }
            // Get the MIME type of the file that is going to be served.
            let mime = Mimetype.detect(this._path);
            if ( mime === null ){
                // No MIME type detected, using a generic one.
                mime = 'application/octet-stream';
            }
            response.setHeader('Content-Type', mime);
            const stream = filesystem.createReadStream(this._path);
            stream.on('error', (error) => {
                this.emit('error', error);
                reject(error);
            });
            stream.on('finish', () => {
                this.emit('sent');
                if ( this._deleteOnceDownloaded !== true ){
                    this._removeOriginalFile().catch((ex) => {
                        Logger.logError(ex);
                    });
                }
            });
            stream.on('open', () => {
                this.emit('sending');
                resolve(stream);
            });
        });
    }
}

module.exports = FileResponse;
