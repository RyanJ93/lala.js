'use strict';

// Including native modules.
const filesystem = require('fs');
const zlib = require('zlib');

// Including Lala's modules.
const Reporter = require('./Reporter');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @typedef {ReportOptions} FileReportOptions An object containing some additional data used to enrich Sentry reports.
 *
 * @property {?string} [path] A string containing the path to the file where the message should be written.
 * @property {?string} [filename] A string containing the name to the file where the message should be written, it will be created in the directory where current log file has been defined.
 */

/**
 * @typedef {ErrorReportOptions} FileErrorReportOptions An object containing some additional data used to enrich Sentry reports.
 *
 * @property {?string} [path] A string containing the path to the file where the message should be written.
 * @property {?string} [filename] A string containing the name to the file where the message should be written, it will be created in the directory where current log file has been defined.
 */

/**
 * Implements logging through files.
 */
class FileReporter extends Reporter {
    /**
     * @type {string} _path A string containing the path to the file where log messages will be written into.
     *
     * @protected
     */
    static _path = FileReporter.DEFAULT_LOG_PATH;

    /**
     * @type {number} An integer number greater or equal to zero representing the size, in bytes, log files shouldn't exceed before being archived into a Gzipped file.
     *
     * @protected
     */
    static _rotateSize = 0;

    /**
     * Ensures the directory containing the given file to exist.
     *
     * @param {string} path A string containing the path to the log file.
     *
     * @protected
     */
    static _ensurePath(path){
        // Extract the directory where the log file is located.
        const index = path.lastIndexOf('/');
        const directory = index === -1 ? '' : path.substr(0, index);
        if ( directory !== '' && !filesystem.existsSync(directory) ){
            // Ensure the directory exists.
            filesystem.mkdirSync(directory, {
                recursive: true
            });
        }
    }

    /**
     * Generates an unique name to use when archiving a log file.
     *
     * @param {string} path A string containing the path to the log file that is going to be archived.
     *
     * @return {string} A string containing the path to the archive to write.
     *
     * @protected
     */
    static _getArchiveName(path){
        let i = 0;
        let archivePath = path + '.' + i + '.tar.gz';
        // Check if the generated name has already been taken, in case generate a new one.
        while ( filesystem.existsSync(archivePath) ){
            i++;
            archivePath = path + '.' + i + '.tar.gz';
        }
        return archivePath;
    }

    /**
     * Generates a compressed archive from a given log file.
     *
     * @param {string} path A string containing the path to the log file to compress.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    static _archive(path){
        return new Promise((resolve, reject) => {
            // Generate an unique name fo the archive file.
            const archiveName = FileReporter._getArchiveName(path);
            // Prepare streams.
            const readStream = filesystem.createReadStream(path);
            const writeStream = filesystem.createWriteStream(archiveName);
            const compressor = zlib.createGzip();
            // Apply file compression.
            readStream.pipe(compressor).pipe(writeStream).on('finish', (error) => {
                if ( error !== null ){
                    return reject(error);
                }
                // Remove the original file.
                filesystem.unlinkSync(path);
                resolve();
            });
        });
    }

    /**
     * Sets up the file reporting system.
     *
     * @param {string} path A string containing the path to the log file where messages will be written into.
     * @param {number} [rotateSize=0] An integer number greater or equal than zero representing the size log file cannot exceed without being archived, if zero no limit will be applied.
     */
    static setup(path, rotateSize = 0){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( rotateSize < 0 || rotateSize === null || isNaN(rotateSize) ){
            throw new InvalidArgumentException('Invalid rotate size.', 2);
        }
        // Ensure the lgo file directory to exist.
        FileReporter._ensurePath(path);
        FileReporter._path = path;
        FileReporter._rotateSize = rotateSize;
    }

    /**
     * Writes a given message to the log file.
     *
     * @param {string} message A string containing the message to write.
     * @param {(FileReportOptions|FileErrorReportOptions)} options An object containing some additional options the method should take care of.
     * @param {string} defaultLevel A string containing the verbosity level to apply if no custom level is given.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    async _log(message, options, defaultLevel){
        const level = typeof options.level === 'string' ? options.level : defaultLevel;
        // Generate the message string.
        message = '[' + FileReporter._getCurrentDate() + '][' + level.toUpperCase() + ']: ' + message + '\n';
        let path = options.path;
        if ( path === '' || typeof path !== 'string' ){
            path = FileReporter._path;
            if ( options.filename !== '' && typeof options.filename === 'string' ){
                // Extract the directory where the log file is located.
                const index = path.lastIndexOf('/');
                const directory = index === -1 ? '' : path.substr(0, index);
                path = directory + '/' + options.filename;
            }
        }else{
            // A custom path is given, ensure the directory to exist.
            FileReporter._ensurePath(path);
        }
        try{
            if ( FileReporter._rotateSize > 0 && filesystem.statSync(path).size >= FileReporter._rotateSize ){
                // Log file has exceeded the maximum size defined, archive it and create a new log file.
                await FileReporter._archive(path);
            }
        }catch(ex){
            if ( ex instanceof Error && ex.code !== 'ENOENT' ){
                // Ignore errors relate to non-existing files as they can be created when writing the first log message.
                throw ex;
            }
        }
        await filesystem.promises.writeFile(path, message, {
            flag: 'a'
        });
    }

    /**
     * The class constructor.
     */
    constructor() {
        super();
    }
    
    /**
     * Reports a given message.
     *
     * @param {string} message A string containing the message to report.
     * @param {?FileReportOptions} [options] An object containing some additional option the method should take care of.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid message is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     *
     * @async
     */
    report(message, options = null){
        if ( typeof message !== 'string' ){
            throw new InvalidArgumentException('Invalid message.', 1);
        }
        if ( options === null ){
            options = {};
        }else if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 2);
        }
        return this._log(message, options, 'info');
    }

    /**
     * Reports a given error.
     *
     * @param {Error} error The error or the exception to report.
     * @param {?FileErrorReportOptions} [options] An object containing some additional option the method should take care of.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid instance of the class "Error" is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     *
     * @async
     */
    reportError(error, options = null){
        if ( !( error instanceof Error ) ){
            throw new InvalidArgumentException('Invalid error.', 1);
        }
        if ( options === null ){
            options = {};
        }else if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 2);
        }
        return this._log(error.stack, options, 'error');
    }
}

/**
 * @constant Defines the default path where log file will be created at.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(FileReporter, 'DEFAULT_LOG_PATH', {
    value: __dirname + '/../../../logs/lala.log'
});

module.exports = FileReporter;
