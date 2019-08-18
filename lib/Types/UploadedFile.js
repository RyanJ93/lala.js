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
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    constructor(path, filename = ''){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid file path.', 1);
        }

        /**
         * @type {string} _path A string representing the path to the uploaded file stored in the temporary directory.
         *
         * @private
         */
        this._path = path;

        /**
         * @type {string} _filename A string containing the user provided file name.
         *
         * @private
         */
        this._filename = typeof filename === 'string' ? filename : '';

        /**
         * @type {string} _extension A string containing the file extension.
         *
         * @private
         */
        this._extension = '';

        /**
         * @type {string} _mime A string containing the mimetype detected from file extension, the "computeMeta" method must be run in order to detect this information.
         *
         * @private
         */
        this._mime = '';

        /**
         * @type {number} [_size=0] An integer number greater or equal than zero representing file size.
         *
         * @private
         */
        this._size = 0;

        if ( this._path !== '' ){
            const index = this._path.lastIndexOf('.');
            this._extension = index === -1 ? '' : this._path.substr(index + 1);
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
     * @return {string} A string representing the mimetype detected.
     */
    getMimetype(){
        return this._mime;
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
            //
            const stats = await filesystem.promises.stat(this._path);
            //
            const mime = Mimetype.detect(this._path);
            this._mime = mime === null ? '' : mime;
            this._size = stats.size;
        }catch(ex){
            throw new RuntimeException('Unable to retrieve file information.', 1, ex);
        }
    }

    async move(destination){

    }
}

module.exports = UploadedFile;
