'use strict';

// Including native modules.
const filesystem = require('fs');
const queryString = require('querystring');
const http = require('http');

// Including Lala's modules.
const InputProcessor = require('../InputProcessor');
const Mimetype = require('../../../Support/Mimetype');
const UploadedFile = require('../../../Types/UploadedFile');
const BufferUtils = require('../../../Utils/BufferUtils');
const { generateUUID } = require('../../../helpers');
const {
    InvalidHTTPRequestException,
    InvalidArgumentException,
    RequestEntityTooLargeHTTPException,
    BadRequestHTTPException
} = require('../../../Exceptions');

/**
 * @typedef {Object} boudary Defines a boundary string used to separate mixed contents in a form-data POST request.
 *
 * @property {Buffer} boundary A buffer containing the original boudary string.
 * @property {Buffer} openingBoundary A variant of the boudary string containing the opening tag and used to declare the beginning of new contents.
 * @property {Buffer} closingBoundary A variant of the boudary string containing th closing tag used to define the end of the POST request data.
 */

/**
 * @typedef {Object} block Represents a form-data parameter.
 *
 * @property {?fileBuffer} file An object containing the uploaded file representation and buffer, if set to null it means that a string field is under processing.
 * @property {string} name A string containing the name associated to the field being processed.
 * @property {string} buffer A string used as a buffer to store string fields.
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
 * @property {{string: string|string[]}} params An object containing the parameters found having as key the parameter name and as value its value.
 * @property {{string: UploadedFile|UploadedFile[]}} files An object having as key the name of the file input used to send the file and as value an instance of the class "UploadedFile" representing the file or an array containing multiple files uploaded using the same name.
 */

/**
 * @typedef {Object} HTTPInputProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {number} [maxInputLength=2097152] An integer number greater than zero representing the max allowed size (in bytes) for request data, by default, 2 mb.
 * @property {string} [temporaryUploadedFileDirectory="./drive/tmp/uploads/"] A string containing the path to the directory where uploaded files will be saved during client request processing.
 * @property {?number} maxUploadedFileSize An integer number greater than zero representing the maximum size allowed for each file (in bytes).
 * @property {?number} maxAllowedFileNumber An integer number greater or equal than zero representing the maximum number of files that a request can contain.
 * @property {Set<string>} deniedFileExtensions A set containing all the file extensions that are not allowed to be uploaded.
 */

/**
 * Handles and processes incoming data from network requests according to the HTTP protocol.
 */
class HTTPInputProcessor extends InputProcessor {
    /**
     * Returns the boundary string contained in a given "Content-Type" header value.
     *
     * @param {string} contentType A string containing the "Content-Type" header value.
     *
     * @return {?boudary} An object containing the boundary found and its opening/closing variants or null if no valid boundary is found.
     *
     * @protected
     */
    static _getBoundary(contentType){
        let boundary = null;
        const components = contentType.split(';');
        if ( components.length === 2 ){
            // Extract boundary string from the "Content-Type" header, right after semicolon.
            boundary = components[1].replace(/\s+/g, '').substr(9);
            if ( boundary.charAt(0) === '"' ){
                // Remove quotes from boundary string found.
                boundary = boundary.substr(1, boundary.length - 1);
            }
        }
        // TODO: Check if encoding is correct.
        return boundary === null || boundary === '' ? null : {
            boundary: boundary,
            openingBoundary: Buffer.from('--' + boundary, 'utf8'),
            closingBoundary: Buffer.from(boundary + '--', 'utf8')
        };
    }

    /**
     * Adds a given parameter definition to the stack of all the loaded parameters or files according to its type.
     *
     * @param {paramStack} stack The stack used to store the parameters found in the client request.
     * @param {block} block Current block representing the parameter to add and its buffered data.
     *
     * @protected
     */
    static _pushParameterToStack(stack, block){
        // TODO: Add support for associative arrays.
        // Check if parameter name indicates that current parameter is an array.
        const isArray = block.name.substr(-2) === '[]';
        if ( block.file === null ){
            // Append this block to the stack of all the POST parameters.
            if ( block.buffer.slice(-2) === '\r\n' ){
                // Remove trailing break lines.
                block.buffer.slice(0, block.buffer.length - 2);
            }
            if ( isArray ){
                // Append this parameter to an existing array or create a new one containing just this entry.
                if ( !stack.params.hasOwnProperty(block.name) ){
                    stack.params[block.name] = [];
                }else if ( !Array.isArray(stack.params[block.name]) ){
                    stack.params[block.name] = [stack.params[block.name]];
                }
                stack.params[block.name].push(block.buffer);
                return;
            }
            stack.params[block.name] = block.buffer;
            return;
        }
        // Close the pointer to the file used to buffer the uploaded file.
        filesystem.closeSync(block.file.fd);
        // Generate an object representing the uploaded file.
        const file = new UploadedFile(block.file.path, block.file.extension);
        if ( isArray ){
            if ( !stack.files.hasOwnProperty(block.name) ){
                stack.files[block.name] = [];
            }else if ( !Array.isArray(stack.files[block.name]) ){
                stack.files[block.name] = [stack.files[block.name]];
            }
            stack.files[block.name].push(file);
        }else{
            stack.files[block.name] = file;
        }
    }

    /**
     * Returns all the headers contained in a given chunk extracted from a block of some POST data.
     *
     * @param {Buffer} chunk A buffer containing the chunk contents the headers should be extracted from.
     *
     * @return {{string: string}} An object having as key the header anme and as value its contents both a strings.
     *
     * @protected
     */
    static _processHeaders(chunk){
        const headers = {};
        // Get the index where HTTP headers contained in request data finish.
        const headersEnd = chunk.indexOf('\r\n\r\n');
        // Get the slice that contains HTTP request headers.
        const headersBlock = chunk.slice(0, headersEnd);
        // Split the obtained block into rows, each row should contain a single header.
        const headersList = BufferUtils.split(headersBlock, '\r\n');
        for ( let n = 0 ; n < headersList.length ; n++ ){
            if ( headersList[n].length === 0 ){
                continue;
            }
            // Break current header into its key/value parts.
            const split = headersList[n].indexOf(': ');
            const key = headersList[n].slice(0, split);
            const value = headersList[n].slice(split + 2);
            if ( key.length !== 0 && value.length !== 0 ){
                // If both parts are valid, then add to the
                headers[key.toString()] = value.toString();
            }
        }
        return headers;
    }

    /**
     * Ensures that the directory where uploaded files are going to be stored exists.
     *
     * @protected
     */
    _ensureTemporaryUploadedFileDirectory(){
        if ( !filesystem.existsSync(this._temporaryUploadedFileDirectory) ){
            // If current directory doesn't exist, create it including its hierarchy.
            filesystem.mkdirSync(this._temporaryUploadedFileDirectory, {
                recursive: true
            });
        }
    }

    _appendToBlock(block, chunk){// DEPRECATED
        if ( block.file === null ){console.log('chunk', '"' + chunk.toString() + '"');
            block.buffer += chunk.toString();
        }else{
            filesystem.writeSync(block.file.fd, chunk);
        }
    }

    /**
     * Processes request data sent and appends to the parameters stack all the POST parameters and files sent.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    _processMultipartRequestData(request){
        return new Promise((resolve, reject) => {
            const contentType = request.headers.hasOwnProperty('content-type') ? request.headers['content-type'] : 'application/x-www-form-urlencoded';
            let block = null, parametersLengthCounter = 0;
            const stack = {
                params: {},
                files: {}
            };
            // Get the boundary string used to separate fields.
            const boundary = HTTPInputProcessor._getBoundary(contentType);
            request.on('data', (data) => {
                const closingBoundaryPosition = data.indexOf(boundary.closingBoundary);
                if ( closingBoundaryPosition !== -1 ){
                    data = data.slice(0, closingBoundaryPosition - 4);
                }
                if ( data.indexOf(boundary.openingBoundary) === -1 && block !== null ){
                    if ( block.file === null ){
                        console.log('append1', '"' + data.toString() + '"');
                    }
                    // Just append
                    this._appendToBlock(block, data);
                }else{
                    const parts = BufferUtils.split(data, boundary.openingBoundary);
                    for ( let i = 0 ; i < parts.length ; i++ ){
                        if ( parts[i].length === 0 ){
                            continue;
                        }
                        const hasNewLine = parts[i].indexOf('\r\n') === 0;
                        if ( block === null || hasNewLine ){
                            if ( block !== null ){
                                HTTPInputProcessor._pushParameterToStack(stack, block);
                            }



                            if ( hasNewLine ){
                                parts[i] = parts[i].slice(2);
                            }
                            /*
                            const filesCount = Object.keys(stack.files).length + 1;
                            if ( filesCount > this._maxAllowedFileNumber ){
                                //
                            }
                            */
                            block = this._prepareBlock(parts[i]);

                            if ( block.file === null ){
                                console.log('append2', '"' + parts[i].toString() + '"', hasNewLine);
                            }

                            // Strip headers.
                            parts[i] = parts[i].slice(parts[i].indexOf('\r\n\r\n') + 4);



                            this._appendToBlock(block, parts[i]);
                            continue;
                        }
                        HTTPInputProcessor._pushParameterToStack(stack, block);
                    }
                }
                if ( closingBoundaryPosition !== -1 ){
                    HTTPInputProcessor._pushParameterToStack(stack, block);
                }
            });
            request.on('end', () => {
                request.params = stack.params;
                request.files = stack.files;
                resolve();
            });
            request.on('error', (error) => {
                // An error occurred while loading request body, for instance, connection has fallen.
                reject(new BadRequestHTTPException('An error occurred while loading request body.', 2, error));
            });
        });
    }

    /**
     * Generates the temporary representation for the parameter being processed.
     *
     * @param {Buffer} chunk A buffer representing the chunk extracted from client data containing the new parameter.
     *
     * @return {block} An object representing the generated block.
     *
     * @protected
     */
    _prepareBlock(chunk){
        const headers = HTTPInputProcessor._processHeaders(chunk);
        const block = {
            name: '',
            file: null,
            buffer: ''
        };
        if ( headers.hasOwnProperty('Content-Disposition') ){
            const header = headers['Content-Disposition'];
            const name = header.match(/name[^;=\n]*=(['"].*?\2|[^;\n]*)/);
            block.name = name !== null && typeof name[1] === 'string' ? name[1].replace(/"/g, '') : '';
            const filename = header.match(/filename[^;=\n]*=(['"].*?\2|[^;\n]*)/);
            const supplementaryFilename = header.match(/filename\*[^;=\n]*=(['"].*?\2|[^;\n]*)/);
            if ( ( filename !== null && typeof filename[1] === 'string' ) || ( supplementaryFilename !== null && typeof supplementaryFilename[1] === 'string' ) ){
                block.file = {};
                block.file.filename = filename !== null && typeof filename[1] === 'string' ? filename[1].replace(/"/g, '') : '';
                block.file.supplementaryFilename = supplementaryFilename !== null && typeof supplementaryFilename[1] === 'string' ? supplementaryFilename[1].replace(/"/g, '') : '';
                block.file.preferredFilename = block.file.supplementaryFilename !== '' ? block.file.supplementaryFilename : block.file.filename;
                block.file.extension = null;
                let index = block.file.preferredFilename.lastIndexOf('.');
                block.file.extension = index === -1 ? '' : block.file.preferredFilename.substr(index + 1).toLowerCase();
                block.file.contentType = block.file.contentType = headers.hasOwnProperty('Content-Type') ? headers['Content-Type'] : 'application/octet-stream';
                if ( this._deniedFileExtensions.has(block.file.extension) ){
                    //TODO: throw exception.
                }
                const tmpFile = this._createTmpFile(block.file.extension);
                block.file = Object.assign(block.file, tmpFile);
            }
        }
        return block;
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
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPInputProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        const baseConfiguration = InputProcessor.getDefaultConfiguration();
        const configuration = Object.create(baseConfiguration);
        configuration.temporaryUploadedFileDirectory = './drive/tmp/uploads/';
        configuration.maxUploadedFileSize = null;
        configuration.maxAllowedFileNumber = null;
        configuration.deniedFileExtensions = new Set();
        return configuration;
    }

    constructor(configuration = null){
        super(configuration);

        /**
         * @type {string} [_temporaryUploadedFileDirectory="./drive/tmp/uploads/"] A string containing the path to the directory where uploaded files will be saved during client request processing.
         *
         * @protected
         */
        this._temporaryUploadedFileDirectory = './drive/tmp/uploads/';

        /**
         * @type {?number} _maxUploadedFileSize An integer number greater than zero representing the maximum size allowed for each file (in bytes).
         *
         * @protected
         */
        this._maxUploadedFileSize = null;

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

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPInputProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPInputProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        super.configure(configuration);
        if ( configuration.hasOwnProperty('temporaryUploadedFileDirectory') && configuration.temporaryUploadedFileDirectory !== '' && typeof configuration.temporaryUploadedFileDirectory === 'string' ){
            this._temporaryUploadedFileDirectory = configuration.temporaryUploadedFileDirectory;
        }
        if ( configuration.hasOwnProperty('maxUploadedFileSize') && ( configuration.maxUploadedFileSize === null || ( !isNaN(configuration.maxUploadedFileSize) && configuration.maxUploadedFileSize > 0 ) ) ){
            this._maxUploadedFileSize = configuration.maxUploadedFileSize;
        }
        if ( configuration.hasOwnProperty('maxAllowedFileNumber') && ( configuration.maxAllowedFileNumber === null || ( !isNaN(configuration.maxAllowedFileNumber) && configuration.maxAllowedFileNumber > 0 ) ) ){
            this._maxAllowedFileNumber = configuration.maxAllowedFileNumber;
        }
        if ( configuration.hasOwnProperty('deniedFileExtensions') && configuration.deniedFileExtensions instanceof Set ){
            this._deniedFileExtensions = configuration.deniedFileExtensions;
        }
        // Ensure the directory where temporary uploaded files will be stored to exist.
        this._ensureTemporaryUploadedFileDirectory();
        return this;
    }

    /**
     * Processes given request in order to append HTTP POST parameters to it.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @override
     */
    async process(request, response){
        if ( request.hasOwnProperty('method') && ( request.method === 'POST' || request.method === 'PATCH' ) ){
            const contentType = request.headers.hasOwnProperty('content-type') ? request.headers['content-type'] : 'application/x-www-form-urlencoded';
            if ( contentType.indexOf('multipart/form-data') === 0 ){
                // Request data may contains both plain parameters and files, let's process them.
                await this._processMultipartRequestData(request);
            }else{
                // Load request data as a plain text by using parent defined method.
                await super.process(request, response);
                if ( contentType !== 'text/plain' ){
                    // Parse the request body.
                    request.params = queryString.parse(request.rawBody);
                }
            }
        }
    }
}

module.exports = HTTPInputProcessor;
