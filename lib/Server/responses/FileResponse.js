'use strict';

// Including native modules.
const filesystem = require('fs');
const crypto = require('crypto');

// Including Lala's modules.
const Response = require('./Response');
const Logger = require('../../Logger');
const Mimetype = require('../../Support/Mimetype');
const {
    InvalidArgumentException,
    RangeNotSatisfiableHTTPException
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
     * Returns the content type that should be declared to the client according to the file defined.
     *
     * @returns {?string} A string representing the content type or null if no suitable content type has been found.
     *
     * @protected
     */
    _getComputedContentType() {
        let contentType;
        if ( this._contentType !== null ){
            contentType = this._contentType;
        }else if ( this._forceDownload === true ){
            contentType = 'application/octet-stream';
        }else{
            contentType = Mimetype.detect(this._path);
        }
        return contentType;
    }

    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the file to send as response to the client.
     * @param {?string} [filename] A string containing a custom file name that the downloaded file should be renamed to, by default the original file name is used.
     * @param {boolean} [forceDownload=true] If set to "true", client will be forced to download and save this file.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     * @throws {InvalidArgumentException} If an invalid file name is given.
     */
    constructor(path, filename = null, forceDownload = true) {
        super();

        /**
         * @type {?string} [_path] A string containing the path to the file to send to the client.
         *
         * @protected
         */
        this._path = null;

        /**
         * @type {?string} _filename A string containing a custom name the downloaded file will be renamed to.
         *
         * @protected
         */
        this._filename = null;

        /**
         * @type {boolean} [_forceDownload=true] If set to "true", client will be forced to download and save this file.
         *
         * @protected
         */
        this._forceDownload = true;

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

        /**
         * @type {boolean} [_allowConditionalRequests=true] If set to "true" it means that IF-* HTTP headers will be considered in order to prevent sending a resource version already owned by the client.
         *
         * @protected
         */
        this._allowConditionalRequests = true;

        /**
         * @type {ContentRangeComponents[]} [_contentRanges=[]] An array of objects where each object represents the file's'slice being served, if empty the full file will be served instead.
         *
         * @protected
         */
        this._contentRanges = [];

        this.setPath(path).setFilename(filename).setForceDownload(forceDownload);
    }

    /**
     * Sets the path to the file to serve, this method is chainable.
     *
     * @returns {string} A string representing the path to the file.
     *
     * @returns {FileResponse}
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    setPath(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid file path.', 1);
        }
        this._path = path;
        return this;
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
     * Sets a custom name the downloaded file will be renamed to, this method is chainable.
     *
     * @param {?string} filename A string containing the file name or null if the original file name should be kept.
     *
     * @returns {FileResponse}
     *
     * @throws {InvalidArgumentException} If an invalid file name is given.
     */
    setFilename(filename){
        if ( filename !== null && ( filename === '' || typeof filename !== 'string' ) ){
            throw new InvalidArgumentException('Invalid file name.', 1);
        }
        this._filename = filename;
        return this;
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
     * Sets if the client should be forced to download this file rather than displaying it, this method is chainable.
     *
     * @param {boolean} forceDownload If set to "true", client will be forced to download and save this file.
     *
     * @returns {FileResponse}
     */
    setForceDownload(forceDownload){
        this._forceDownload = forceDownload !== false;
        return this;
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
     * Sets if client provided version information should be checked in order to prevent sending a resource already owned by the client, this method is chainable.
     *
     * @param {boolean} allowConditionalRequests If set to "true" already owned versions of this resource won't be sent to the client.
     *
     * @returns {FileResponse}
     */
    setAllowConditionalRequests(allowConditionalRequests){
        this._allowConditionalRequests = allowConditionalRequests !== false;
        return this;
    }

    /**
     * Returns if client provided version information should be checked in order to prevent sending a resource already owned by the client.
     *
     * @returns {boolean} If already owned versions of this resource are not going to be sent to the client will be returned "true".
     */
    getAllowConditionalRequests(){
        return this._allowConditionalRequests !== false;
    }

    /**
     * Prepares internal properties and checks if current response can be served according to current client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If current response can be served will be returned "true".
     *
     * @throws {RangeNotSatisfiableHTTPException} If client provided range is not satisfiable according tho the file being served.
     *
     * @async
     * @override
     */
    async prepare(request, response){
        // Get file information.
        const stats = await filesystem.promises.stat(this._path);
        // Generate the file's eTag
        const eTag = crypto.createHash('sha1').update(stats.ino + '@' + stats.mtimeMs + '@' + stats.size).digest().toString('hex');
        // Get the content type to declare.
        const contentType = this._getComputedContentType();
        const ranges = [], length = request.ranges.length;
        for ( let i = 0 ; i < length ; i++ ){
            // Compute the start and the end index of the file slice to return according to client provided ranges.
            const start = request.ranges[i].rangeStart === null ? 0 : request.ranges[i].rangeStart;
            let end = request.ranges[i].rangeEnd === null ? ( stats.size - 1 ) : request.ranges[i].rangeEnd;
            if ( request.ranges[i].suffixLength !== null ){
                end = stats.size - request.ranges[i].suffixLength;
            }
            if ( start >= stats.size || end > stats.size ){
                throw new RangeNotSatisfiableHTTPException('Requested range is not satisfiable for requested resource.', 1);
            }
            ranges.push({
                start: start,
                end: end,
                size: stats.size,
                length: ( end - start + 1 )
            });
        }
        // Check if the resource has changed according to the tracking information provided by the client.
        const unchanged = this._allowConditionalRequests === true && typeof request.matchConditionals === 'function' && request.matchConditionals(eTag, stats.mtime);
        this._responseProperties.setMIMEType(contentType).setCharset(this._charset).setContentLength(stats.size).setETag(eTag);
        this._responseProperties.setLastModifiedDate(stats.mtime).setRangedRequestSupported(true).setUnchanged(unchanged);
        this._responseProperties.setContentRanges(ranges);
        this._contentRanges = ranges;
        // If the response has not changed return "false" as it shouldn't be served again.
        return !unchanged;
    }

    /**
     * Sends a file to the client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<ReadStream[]>} A stream to the file to serve.
     *
     * @async
     * @override
     */
     apply(request, response){
        return new Promise((resolve, reject) => {
            if ( this._forceDownload === true ){
                response.setHeader('Content-Description', 'File Transfer');
                response.setHeader('Content-Disposition', 'attachment');
                response.setHeader('Expires', '0');
            }
            // If no range is going to be returned (because no range has been declared by the client), create a range including the whole file.
            const ranges = this._contentRanges.length === 0 ? [{
                start: 0,
                end: Infinity
            }] : this._contentRanges;
            // Multiple ranges currently not supported, serve the first one.
            // TODO: Add support for multiple ranges.
            const stream = filesystem.createReadStream(this._path, {
                start: ranges[0].start,
                //end: ( ranges[0].end === this._responseProperties.getContentLength().size - 1 ? Infinity : ranges[0].end )
                end: ranges[0].end
            });
            stream.on('error', (error) => {
                this.emit('error', error);
                reject(error);
            });
            stream.on('finish', () => {
                this.emit('sent');
                if ( this._deleteOnceDownloaded !== true ){
                    // THe file has been sent, remove it.
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
