'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const BufferUtils = require('../../Utils/BufferUtils');
const UploadedFile = require('../../Types/UploadedFile');
const { generateUUID } = require('../../Helpers/helpers/BuiltInHelpers');
const {
    InvalidArgumentException,
    RequestEntityTooLargeHTTPException,
    BadRequestHTTPException
} = require('../../Exceptions');

/**
 * @typedef {Object} parameterContainer Represents a form-data parameter.
 *
 * @property {?fileBuffer} file An object containing the uploaded file representation and buffer, if set to null it means that a string field is under processing.
 * @property {string} name A string containing the name associated to the field being processed.
 * @property {string} buffer A string used as a buffer to store string fields.
 * @property {number} size An integer number greater than zero used to store current parameter/file size in bytes.
 * @property {boolean} skip If set to "true" it means that current parameter should not be processed.
 */

/**
 * @typedef {Object} fileBuffer Represents a file currently being uploaded.
 *
 * @property {string} filename A string containing the file name provided by client.
 * @property {string} supplementaryFilename A string containing an additional variant of the client provided file name using the encoding defined in RFC 5987.
 * @property {string} preferredFilename A string containing the client provided file name to use chosen between "filename" and "supplementaryFilename".
 * @property {string} extension A string containing the file extension based on file name defined on client-side.
 * @property {string} contentType A string containing the client defined MIME type for this file.
 * @property {number} fd An integer number representing the file handler used in write operations and referencing the temporary file created.
 * @property {string} path A string containing the path to the temporary file created to store the uploaded contents for this file.
 */

/**
 * @typedef {Object} tmpFileDescriptor An object representing a temporary file created to store uploaded contents.
 *
 * @property {number} fd An integer number representing the file handler used in write operations and referencing the temporary file created.
 * @property {string} path A string containing the path to the temporary file created to store the uploaded contents for this file.
 */

/**
 * @typedef {Object} paramStack Contains all the parameters and files found by parsing the request data sent by a client.
 *
 * @property {Object.<string, string|string[]>} params An object containing the parameters found having as key the parameter name and as value its value.
 * @property {Object.<string, UploadedFile|UploadedFile[]>} files An object having as key the name of the file input used to send the file and as value an instance of the class "UploadedFile" representing the file or an array containing multiple files uploaded using the same name.
 * /

/**
 * Implements a parser that can be used to extract parameters and upload files from a multi part HTTP request body.
 */
class HTTPMultiPartFormDataParser {
    /**
     * Extracts headers from a given chunk.
     *
     * @param {Buffer} chunk A buffer containing the chunk contents the headers should be extracted from.
     *
     * @protected
     */
    _processHeaders(chunk){
        let headers = null;
        // Get the index where HTTP headers contained in request data finish.
        const headersEnd = chunk.indexOf(HTTPMultiPartFormDataParser.DOUBLE_CRLF);
        // Get the slice that contains HTTP request headers.
        const headersBlock = chunk.slice(0, headersEnd);
        if ( headersBlock.length > 0 ){
            // Split the obtained block into rows, each row should contain a single header.
            const headersList = BufferUtils.split(headersBlock, HTTPMultiPartFormDataParser.CRLF);
            headers = Object.create(null);
            for ( let n = 0 ; n < headersList.length ; n++ ){
                if ( headersList[n].length > 0 ){
                    // Break current header into its key/value parts.
                    const split = headersList[n].indexOf(': ');
                    const key = headersList[n].slice(0, split);
                    const value = headersList[n].slice(split + 2);
                    if ( key.length !== 0 && value.length !== 0 ){
                        // If both parts are valid, then add to the
                        headers[key.toString()] = value.toString();
                    }
                }
            }
        }
        this._currentParameterHeaders = headers;
        return headersEnd;
    }

    /**
     * Generates a temporary file used to store uploaded contents.
     *
     * @param {string} extension A string containing the extension this file should have.
     *
     * @return {tmpFileDescriptor} An object representing the generated file and containing its pointer.
     *
     * @protected
     */
    _createTmpFile(extension){
        const path = this._temporaryUploadedFileDirectory + generateUUID(4, false) + '.' + extension;
        return {
            fd: filesystem.openSync(path, 'as'),
            path: path
        };
    }

    /**
     * Sets up a new parameter container according to its headers.
     *
     * @throws {RequestEntityTooLargeHTTPException} If the maximum number of allowed file has been overtaken.
     *
     * @protected
     */
    _initParameterProcessing(){
        // Extract headers from given chunk.
        const block = {name: '', file: null, buffer: '', size: 0, skip: false};
        if ( this._currentParameterHeaders['Content-Disposition'] !== '' && typeof this._currentParameterHeaders['Content-Disposition'] === 'string' ){
            const contentDisposition = this._currentParameterHeaders['Content-Disposition'];
            // Extract current parameter name from the provided header.
            const name = contentDisposition.match(/name[^;=\n]*=(['"].*?\2|[^;\n]*)/);
            block.name = name !== null && typeof name[1] === 'string' ? name[1].replace(/"/g, '') : '';
            // Extract the filename provided by the client, it will be used only if current parameter is a file.
            const filename = contentDisposition.match(/filename[^;=\n]*=(['"].*?\2|[^;\n]*)/);
            // Extract the filename version that uses the encoding defined in RFC 5987.
            const supplementaryFilename = contentDisposition.match(/filename\*[^;=\n]*=(['"].*?\2|[^;\n]*)/);
            if ( ( filename !== null && typeof filename[1] === 'string' ) || ( supplementaryFilename !== null && typeof supplementaryFilename[1] === 'string' ) ){
                if ( this._allowFileUploads === true ){
                    if ( this._maxAllowedFileNumber !== null && this._filesCount >= this._maxAllowedFileNumber ){
                        throw new RequestEntityTooLargeHTTPException('Maximum number of files exceeded.', 1);
                    }
                    // A filename has been provided, current parameter will be considered as a file.
                    block.file = {};
                    block.file.filename = filename !== null && typeof filename[1] === 'string' ? filename[1].replace(/"/g, '') : '';
                    block.file.supplementaryFilename = supplementaryFilename !== null && typeof supplementaryFilename[1] === 'string' ? supplementaryFilename[1].replace(/"/g, '') : '';
                    block.file.preferredFilename = block.file.supplementaryFilename !== '' ? block.file.supplementaryFilename : block.file.filename;
                    block.file.extension = null;
                    // Extract current file extension according to its filename.
                    const index = block.file.preferredFilename.lastIndexOf('.');
                    block.file.extension = index === -1 ? '' : block.file.preferredFilename.substr(index + 1).toLowerCase();
                    // Check if a MIME type has been provided by the client, otherwise use the generic "application/octet-stream".
                    block.file.contentType = typeof this._currentParameterHeaders['Content-Type'] === 'string' ? this._currentParameterHeaders['Content-Type'] : 'application/octet-stream';
                    if ( this._deniedFileExtensions.has(block.file.extension) ){
                        // This parameter should be ignored as the corresponding file is not allowed.
                        block.skip = true;
                    }else{
                        // Allocate a temporary file where current file will be stored in while being uploaded.
                        const tmpFile = this._createTmpFile(block.file.extension);
                        // Add temporary file's path and file descriptor generated to the block to return.
                        block.file = Object.assign(block.file, tmpFile);
                    }
                    this._filesCount++;
                }else{
                    // File uploads are disabled, ignoring the file being uploaded.
                    block.skip = true;
                }
            }
        }
        this._currentParameter = block;
    }

    /**
     * Pushes the parameter container being processed to the list of parameters or files found.
     *
     * @protected
     */
    _pushParameterToStack(){
        // Check if parameter name indicates that current parameter is an array.
        const isArray = this._currentParameter.name.substr(-2) === '[]';
        if ( this._currentParameter.file === null ){
            // Append this this._currentParameter to the stack of all the POST parameters.
            if ( this._currentParameter.buffer.slice(-2) === '\r\n' ){
                // Remove trailing break lines.
                this._currentParameter.buffer.slice(0, this._currentParameter.buffer.length - 2);
            }
            if ( isArray ){
                // Append this parameter to an existing array or create a new one containing just this entry.
                if ( typeof this._parameters.params[this._currentParameter.name] === 'undefined' ){
                    this._parameters.params[this._currentParameter.name] = [];
                }else if ( !Array.isArray(this._parameters.params[this._currentParameter.name]) ){
                    this._parameters.params[this._currentParameter.name] = [this._parameters.params[this._currentParameter.name]];
                }
                this._parameters.params[this._currentParameter.name].push(this._currentParameter.buffer);
                return;
            }
            this._parameters.params[this._currentParameter.name] = this._currentParameter.buffer;
        }else{
            // Close the pointer to the file used to buffer the uploaded file.
            filesystem.closeSync(this._currentParameter.file.fd);
            // Generate an object representing the uploaded file.
            const file = new UploadedFile(this._currentParameter.file.path, this._currentParameter.file.extension, this._currentParameter.size);
            if ( isArray ){
                if ( typeof this._parameters.files[this._currentParameter.name] === 'undefined' ){
                    this._parameters.files[this._currentParameter.name] = [];
                }else if ( !Array.isArray(this._parameters.files[this._currentParameter.name]) ){
                    this._parameters.files[this._currentParameter.name] = [this._parameters.files[this._currentParameter.name]];
                }
                this._parameters.files[this._currentParameter.name].push(file);
            }else{
                this._parameters.files[this._currentParameter.name] = file;
            }
        }
        // Reset current parameter container and headers.
        this._currentParameter = null;
        this._currentParameterHeaders = null;
    }

    /**
     * Appends some given data to the current parameter container.
     *
     * @param {Buffer} chunk A buffer containing the contents to append.
     *
     * @throws {RequestEntityTooLargeHTTPException} If the file being uploaded has exceeded the maximum size allowed.
     *
     * @protected
     */
    _appendToCurrentParameter(chunk){
        if ( this._currentParameter.file === null ){
            this._currentParameter.buffer += chunk.toString();
        }else{
            filesystem.writeSync(this._currentParameter.file.fd, chunk);
        }
        this._currentParameter.size += chunk.length;
        if ( this._maxUploadedFileSize !== null && this._currentParameter.file !== null && this._currentParameter.size > this._maxUploadedFileSize ){
            throw new RequestEntityTooLargeHTTPException('Maximum file size exceeded.', 1);
        }
    }

    /**
     * Processes all the additional information related to uploaded files.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _processUploadedFileMeta(){
        const processes = [];
        for ( const name in this._parameters.files ){
            if ( Array.isArray(this._parameters.files[name]) ){
                for ( let i = 0 ; i < this._parameters.files[name].length ; i++ ){
                    processes.push(this._parameters.files[name][i].computeMeta());
                }
            }else{
                processes.push(this._parameters.files[name].computeMeta());
            }
        }
        await Promise.all(processes);
    }

    /**
     * The class constructor.
     */
    constructor() {
        /**
         * @type {string} [_temporaryUploadedFileDirectory="drive/tmp/uploads/"] A string containing the path to the directory where uploaded files will be saved during client request processing.
         *
         * @protected
         */
        this._temporaryUploadedFileDirectory = 'drive/tmp/uploads/';

        /**
         * @type {?number} [_maxUploadedFileSize=10485760] An integer number greater than zero representing the maximum size allowed for each file (in bytes).
         *
         * @protected
         */
        this._maxUploadedFileSize = 10485760;

        /**
         * @type {?number} _maxAllowedFileNumber An integer number greater or equal than zero representing the maximum number of files that a request can contain.
         *
         * @protected
         */
        this._maxAllowedFileNumber = null;

        /**
         * @type {Set<string>} _deniedFileExtensions A set containing all the file extensions that are not allowed to be uploaded.
         *
         * @protected
         */
        this._deniedFileExtensions = new Set();

        /**
         * @type {boolean} [_allowFileUploads=true] If set to "false" uploaded files found will be ignored.
         *
         * @protected
         */
        this._allowFileUploads = true;

        /**
         * @type {number} [_state=0] An integer number greater than zero representing current state in DFA context.
         *
         * @protected
         */
        this._state = 0;

        /**
         * @type {paramStack} _parameters An object containing all the parameters and files found while parsing a HTTP body.
         *
         * @protected
         */
        this._parameters = {params: Object.create(null), files: Object.create(null)};

        /**
         * @type {?parameterContainer} [_currentParameter] An object representing the parameter currently being processed.
         *
         * @protected
         */
        this._currentParameter = null;

        /**
         * @type {?Object.<string, string>} An object containing the headers associated to the parameter currently being processed.
         *
         * @protected
         */
        this._currentParameterHeaders = null;

        /**
         * @type {?Buffer} [_boundary] The boundary string used as a separator for parameters.
         *
         * @protected
         */
        this._boundary = null;

        /**
         * @type {?Buffer} [_closingBoundary] The boundary version used to close the whole body.
         *
         * @protected
         */
        this._closingBoundary = null;

        /**
         * @type {number} [_filesCount=0] An integer number used as a counter for every uploaded file.
         *
         * @protected
         */
        this._filesCount = 0;
    }

    /**
     * Sets the list of all the extensions that should be ignored during file upload, this method is chainable.
     *
     * @param {Set<string>} deniedFileExtensions A set containing the file extensions to ignore.
     *
     * @returns {HTTPMultiPartFormDataParser}
     *
     * @throws {InvalidArgumentException} If an invalid set of file extensions is given.
     */
    setDeniedFileExtensions(deniedFileExtensions){
        if ( !( deniedFileExtensions instanceof Set ) ){
            throw new InvalidArgumentException('Invalid extensions set.', 1);
        }
        this._deniedFileExtensions = deniedFileExtensions;
        return this;
    }

    /**
     * Returns the list of all the file extensions that will be ignored during file upload.
     *
     * @returns {Set<string>} A set containing the file extensions to ignore.
     */
    getDeniedFileExtensions(){
        return this._deniedFileExtensions;
    }

    /**
     * Sets the path to the directory where uploaded files should be stored in, this method is chainable.
     *
     * @param {string} temporaryUploadedFileDirectory A string containing the path to the folder.
     *
     * @returns {HTTPMultiPartFormDataParser}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setTemporaryUploadedFileDirectory(temporaryUploadedFileDirectory){
        if ( temporaryUploadedFileDirectory === '' || typeof temporaryUploadedFileDirectory !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._temporaryUploadedFileDirectory = temporaryUploadedFileDirectory;
        return this;
    }

    /**
     * Returns the path to the directory where uploaded files will be stored in.
     *
     * @returns {string} A string containing the path to the folder.
     */
    getTemporaryUploadedFileDirectory(){
        return this._temporaryUploadedFileDirectory;
    }

    /**
     * Sets the maximum size allowed for uploaded files, this method is chainable.
     *
     * @param {?number} maxUploadedFileSize An integer number greater than zero representing the file size in bytes or null if unlimited.
     *
     * @returns {HTTPMultiPartFormDataParser}
     *
     * @throws {InvalidArgumentException} If the given size value is not valid.
     */
    setMaxUploadedFileSize(maxUploadedFileSize){
        if ( maxUploadedFileSize !== null && ( isNaN(maxUploadedFileSize) || maxUploadedFileSize <= 0 ) ){
            throw new InvalidArgumentException('Invalid maximum file size.', 1);
        }
        this._maxUploadedFileSize = maxUploadedFileSize;
        return this;
    }

    /**
     * Returns the maximum size allowed for uploaded files.
     *
     * @returns {?number} An integer number greater than zero representing the file size in bytes or null if no limit has been set.
     */
    getMaxUploadedFileSize(){
        return this._maxUploadedFileSize;
    }

    /**
     * Sets the maximum number of uploaded files allowed, this method is chainable.
     *
     * @param {?number} maxAllowedFileNumber An integer number greater than zero representing the number of files or null if no limit should be applied.
     *
     * @returns {HTTPMultiPartFormDataParser}
     *
     * @throws {InvalidArgumentException} If an invalid number is given.
     */
    setMaxAllowedFileNumber(maxAllowedFileNumber){
        if ( maxAllowedFileNumber !== null && ( isNaN(maxAllowedFileNumber) || maxAllowedFileNumber <= 0 ) ){
            throw new InvalidArgumentException('Invalid file count.', 1);
        }
        this._maxAllowedFileNumber = maxAllowedFileNumber;
        return this;
    }

    /**
     * Returns the maximum number of uploaded files allowed.
     *
     * @returns {?number} An integer number greater than zero or null if no limit has been defined.
     */
    getMaxAllowedFileNumber(){
        return this._maxAllowedFileNumber;
    }

    /**
     * Sets if uploaded files should be accepted or not, this method is chainable.
     *
     * @param {boolean} allowFileUploads If set to "false" uploaded files found will be ignored.
     *
     * @returns {HTTPMultiPartFormDataParser}
     */
    setAllowFileUploads(allowFileUploads){
        this._allowFileUploads = allowFileUploads !== false;
        return this;
    }

    /**
     * Returns if uploaded files should be accepted or not.
     *
     * @returns {boolean} If uploaded files will be accepted will be returned "true".
     */
    getAllowFileUploads(){
        return this._allowFileUploads !== false;
    }

    /**
     * Sets up HTTP body parsing according to the headers contained in the given request stream.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {boolean} [clean=true] If set to "true" previous context will be reset in order to start a new parsing procedure.
     *
     * @returns {HTTPMultiPartFormDataParser}
     */
    prepare(request, clean = true){
        let boundary = null, closingBoundary = null;
        if ( request.headers['content-type'] !== '' && typeof request.headers['content-type'] === 'string' ){
            const components = request.headers['content-type'].split(';');
            if ( components.length === 2 ){
                // Extract boundary string from the "Content-Type" header, right after semicolon.
                boundary = components[1].replace(/\s+/g, '').substr(9);
                if ( boundary.charAt(0) === '"' ){
                    // Remove quotes from boundary string found.
                    boundary = boundary.substr(1, boundary.length - 1);
                }
            }
            boundary = Buffer.from('--' + boundary, 'utf8');
            closingBoundary = Buffer.from(boundary + '--', 'utf8');
        }
        this._boundary = boundary;
        this._closingBoundary = closingBoundary;
        if ( clean === true ){
            // Cleaning up previous parsing context.
            this._state = 0;
            this._parameters = {params: Object.create(null), files: Object.create(null)};
            this._currentParameter = null;
            this._currentParameterHeaders = null;
            this._filesCount = 0;
        }
        return this;
    }

    /**
     * Processes the given data chunk from the request stream being processed.
     *
     * @param {Buffer} data A buffer containing some data to parse.
     *
     * @throws {BadRequestHTTPException} If given data is malformed according to parser.
     *
     * @see Diagram available here: https://mega.nz/#!q4wRGCTT!KfwSYNoEX-dHUXv1ELYofGB9TJ-fxFB5JbTv_4A8q1U
     */
    parse(data){
        if ( data.length > 0 ){
            switch ( this._state ){
                case 0: {
                    if ( data.indexOf(this._boundary) === 0 ){
                        this._state = 1;
                        // Process further contents after removing the recognized token.
                        data = data.slice(this._boundary.length);
                    }else {
                        this._state = 4;
                    }
                    this.parse(data);
                }break;
                case 1: {
                    if ( data.indexOf(HTTPMultiPartFormDataParser.CRLF) !== 0 ){
                        throw new BadRequestHTTPException('Unable to process request body.', 1);
                    }
                    this._state = 2;
                    this.parse(data.slice(2));
                }break;
                case 2: {
                    const headersEnd = this._processHeaders(data);
                    if ( this._currentParameterHeaders === null ){
                        throw new BadRequestHTTPException('Unable to process request body.', 1);
                    }
                    this._state = 3;
                    this.parse(data.slice(headersEnd));
                }break;
                case 3: {
                    if ( data.indexOf(HTTPMultiPartFormDataParser.DOUBLE_CRLF) !== 0 ){
                        throw new BadRequestHTTPException('Unable to process request body.', 1);
                    }
                    this._state = 4;
                    // A new parameter declaration has been found, generate its container.
                    this._initParameterProcessing();
                    this.parse(data.slice(4));
                }break;
                case 4: {
                    const endOfDataIndex = data.indexOf(HTTPMultiPartFormDataParser.CRLF);
                    if ( endOfDataIndex === -1 ){
                        if ( !this._currentParameter.skip ){
                            // Append this data to the parameter being processed.
                            this._appendToCurrentParameter(data);
                        }
                    }else{
                        this._state = 5;
                        if ( !this._currentParameter.skip ){
                            this._appendToCurrentParameter(data.slice(0, endOfDataIndex));
                        }
                        this.parse(data.slice(endOfDataIndex + 2));
                    }
                }break;
                case 5: {
                    const isFinal = data.indexOf(this._closingBoundary) === 0;
                    if ( isFinal || data.indexOf(this._boundary) === 0 ){
                        if ( !this._currentParameter.skip ){
                            // Add the parameter currently being processed to the list of all the parameters extracted so far.
                            this._pushParameterToStack();
                        }
                        if ( isFinal ){
                            this._state = 6;
                            data = data.slice(this._closingBoundary.length);
                        }else{
                            this._state = 1;
                            data = data.slice(this._boundary.length);
                        }
                    }else{
                        this._state = 4;
                        if ( !this._currentParameter.skip ){
                            this._appendToCurrentParameter(Buffer.from(HTTPMultiPartFormDataParser.CRLF));
                        }
                    }
                    this.parse(data);
                }break;
                case 6: {
                    if ( data.indexOf(HTTPMultiPartFormDataParser.CRLF) !== 0 ){
                        throw new BadRequestHTTPException('Unable to process request body.', 1);
                    }
                    // More contents found, keep on parsing.
                    this.parse(data.slice(2));
                }break;
            }
        }
    }

    /**
     * Verifies if the chunks parsed so far represent a valid HTTP body structure.
     *
     * @returns {Promise<void>}
     *
     * @throws {BadRequestHTTPException} If given data is malformed according to parser.
     *
     * @async
     */
    async end(){
        if ( this._state !== 6 ) {
            throw new BadRequestHTTPException('Unable to process request body.', 1);
        }
        // Process additional uploaded files' properties such as the MIME type.
        this._processUploadedFileMeta();
        this._currentParameter = null;
        this._currentParameterHeaders = null;
    }

    /**
     * Returns all the parameters (excluding files) found so far.
     *
     * @returns {Object.<string, (string|string[])>} An object having as key the parameter name and as value the parameter contents.
     */
    getParameters(){
        return this._parameters.params;
    }

    /**
     * Returns all the files uploaded so far.
     *
     * @returns {Object.<string, (UploadedFile|UploadedFile[])>} An object having as key the name associated to the file and as value an instance of the class "UploadedFile" representing the uploaded file.
     */
    getFiles(){
        return this._parameters.files;
    }
}

/**
 * @constant Defines the break line sequence.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(HTTPMultiPartFormDataParser, 'CRLF', {
    value: '\r\n',
    writable: false,
    configurable: true,
    enumerable: true
});

/**
 * @constant Defines the break line sequence used to separate the headers to the parameter contents.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(HTTPMultiPartFormDataParser, 'DOUBLE_CRLF', {
    value: '\r\n\r\n',
    writable: false,
    configurable: true,
    enumerable: true
});

module.exports = HTTPMultiPartFormDataParser;
