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

        /**
         * @type {?string} [_charset] A string containing the charset to declare when sending the file to the client along side its content type.
         *
         * @protected
         */
        this._charset = null;

        /**
         * @type {?string} [_contentType] A string containing the MIME type to declare when sending the file to the client, if not set it will be auto-detected.
         *
         * @protected
         */
        this._contentType = null;
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
     * Sets the charset to declare when sending the file to the client, this method is chainable.
     *
     * @param {?string} charset A string containing the name of the charset or null if no charset should be declared.
     *
     * @returns {FileResponse}
     *
     * @throws {InvalidArgumentException} If an invalid charset is given.
     */
    setCharset(charset){
        if ( charset !== null && typeof charset !== 'string' ){
            throw new InvalidArgumentException('Invalid charset.', 1);
        }
        this._charset = charset === '' ? null : charset;
        return this;
    }

    /**
     * Returns the file charset that has been declared.
     *
     * @returns {?string} A string containing the charset name or null if no charset has been declared.
     */
    getCharset(){
        return this._charset;
    }

    /**
     * Sets the content type to declare when sending the file to the client, this method is chainable.
     *
     * @param {?string} contentType A string containing the content type, if null it will be auto-detected when the file is being sent.
     *
     * @returns {FileResponse}
     *
     * @throws {InvalidArgumentException} If an invalid content type is given.
     */
    setContentType(contentType){
        if ( contentType !== null && typeof contentType !== 'string' ){
            throw new InvalidArgumentException('Invalid content type.', 1);
        }
        this._contentType = contentType === '' ? null : contentType;
        return this;
    }

    /**
     * Returns the content type that has been declared.
     *
     * @returns {?string} A string containing the content type or null if no content type has been declared.
     */
    getContentType(){
        return this._contentType;
    }

    /**
     * Returns the content type that should be declared to the client according to the file defined.
     *
     * @returns {?string} A string representing the content type or null if no suitable content type has been found.
     *
     * @override
     */
    getComputedContentType() {
        return this._contentType === null ? Mimetype.detect(this._path) : this._contentType;
    }

    /**
     * Returns the charset that should be declared to the client alongside the content type.
     *
     * @returns {?string} A string representing the charset or null if no suitable charset has been found.
     *
     * @override
     */
    getComputedCharset() {
        return this._charset;
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
            // Open the file to send as a stream.
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
