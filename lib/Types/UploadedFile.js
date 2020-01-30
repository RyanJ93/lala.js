'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const Mimetype = require('../Support/Mimetype');
const {
    InvalidArgumentException,
    RuntimeException
} = require('../Exceptions');

/**
 * Represents an uploaded file stored in the temporary file directory.
 */
class UploadedFile {
    /**
     * The class constructor.
     *
     * @param {string} path A string representing the path to the temporary file generated from uploaded data.
     * @param {string} [filename=''] A string representing the original file name, if omitted, given file's name will be used instead.
     * @param {number} [size=0] An integer number greater than zero representing the fiel size in bytes, if zero it should be computed internally.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    constructor(path, filename = '', size = 0){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid file path.', 1);
        }

        /**
         * @type {string} _path A string representing the path to the uploaded file stored in the temporary directory.
         *
         * @protected
         */
        this._path = path;

        /**
         * @type {string} _filename A string containing the user provided file name.
         *
         * @protected
         */
        this._filename = typeof filename === 'string' ? filename : '';

        /**
         * @type {string} _extension A string containing the file extension.
         *
         * @protected
         */
        this._extension = '';

        /**
         * @type {string} [_mime="application/octet-stream"] A string containing the MIME type detected from file extension, the "computeMeta" method must be run in order to detect this information.
         *
         * @protected
         */
        this._mime = 'application/octet-stream';

        /**
         * @type {number} [_size=0] An integer number greater or equal than zero representing file size.
         *
         * @protected
         */
        this._size = size > 0 ? size : 0;

        /**
         * @type {boolean} [_moved=false] If set to "true" it means that this file has been moved to a persistent location and then it should not be removed once request is complete.
         *
         * @protected
         */
        this._moved = false;

        const source = this._filename !== '' ? this._filename : this._path;
        if ( source !== '' ){
            const index = source.lastIndexOf('.');
            this._extension = index === -1 ? '' : source.substr(index + 1);
        }
    }

    /**
     * Returns the path to the temporary uploaded file.
     *
     * @return {string} A string representing the path where the file is located at.
     */
    getPath(){
        return this._path;
    }

    /**
     * Returns the user provided file name.
     *
     * @return {string} A string representing the file name.
     */
    getFilename(){
        return this._filename;
    }

    /**
     * Returns the file extension.
     *
     * @return {string} A string representing the file extension.
     */
    getExtension(){
        return this._extension;
    }

    /**
     * Returns the file size.
     *
     * @return {number} An integer number greater or equal than zero representing the file size in bytes.
     */
    getSize(){
        return this._size;
    }

    /**
     * Returns the file mime type.
     *
     * @return {string} A string representing the MIME type detected.
     */
    getMimetype(){
        return this._mime;
    }

    /**
     * Returns if this uploaded file has been moved to a permanent location.
     *
     * @returns {boolean} If this file has been moved to its permanents location will be returned "true".
     */
    moved(){
        return this._moved;
    }

    /**
     * Processes file information.
     *
     * @return {Promise<void>}
     *
     * @async
     */
    async computeMeta(){
        try{
            if ( this._size > 0 ){
                // Gat additional file information.
                const stats = await filesystem.promises.stat(this._path);
                this._size = stats.size;
            }
            // Get current file MIME type.
            const mime = Mimetype.detect(this._path);
            this._mime = mime === null ? '' : mime;
        }catch(ex){
            throw new RuntimeException('Unable to retrieve file information.', 1, ex);
        }
    }

    /**
     * Moves this file to a given location.
     *
     * @param {string} destination A string containing the path to the file location.
     * @param {?string} [filename] A string containing the name this file should be renamed to.
     * @param {boolean} [persistent=true] If set to "true" this file will be marked as moved persistently, so it won't be removed once request is completed.
     *
     * @returns {Promise<void>}
     */
    async move(destination, filename = null, persistent = true){
        if ( destination === '' || typeof destination !== 'string' ){
            throw new InvalidArgumentException('Invalid destination path.', 1);
        }
        if ( filename !== null ){
            if ( filename == '' || typeof filename !== 'string' ){
                throw new InvalidArgumentException('Invalid file name.', 2);
            }
            destination += '/' + filename;
        }else{
            // Extract the file name from the file path.
            const index = this._path.lastIndexOf('/');
            destination += '/' + ( index === -1 ? this._path : this._path.substr(index + 1) );
        }
        await filesystem.promises.rename(this._path, destination);
        this._path = destination;
        this._moved = persistent === true;
    }

    /**
     * Opens current file for reading operations.
     *
     * @returns {Promise<Buffer>} A buffer representing the file contents.
     *
     * @async
     */
    read(){
        return filesystem.promises.readFile(this._path);
    }

    /**
     * Opens current file for reading operations synchronously.
     *
     * @returns {Buffer} A buffer representing the file contents.
     */
    readSync(){
        return filesystem.readFileSync(this._path);
    }

    /**
     * Opens current file for reading operations returning a readable stream.
     *
     * @returns {ReadStream} A readable stream to current file.
     */
    openStream(){
        return filesystem.createReadStream(this._path);
    }
}

module.exports = UploadedFile;
