'use strict';

// Including Lala's modules.
const Reporter = require('./reporters/Reporter');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @callback logCallback The callback function that allows to define options when invoking the "logWithOptions" method.
 *
 * @param {Reporter} reporter An instance of the class that implements the reporter being invoked.
 *
 * @returns {?ReportOptions} An object containing some custom options to pass to the reporter.
 */

/**
 * @callback logErrorCallback The callback function that allows to define options when invoking the "logErrorWithOptions" method.
 *
 * @param {Reporter} reporter An instance of the class that implements the reporter being invoked.
 *
 * @returns {?ErrorReportOptions} An object containing some custom options to pass to the reporter.
 */

/**
 * This class allows to report log messages and errors in all the supported ways.
 */
class Logger {
    /**
     * @type {Set<Reporter>} _reporters A set containing all the report services given messages will be reported through.
     *
     * @protected
     */
    static _reporters = new Set();

    /**
     * @type {boolean} [_debug=false] If set to "true" it means that the application logging is in debug mode.
     *
     * @protected
     */
    static _debug = false;

    /**
     * Adds a reporter service to the list of all the reporters messages will be reported through.
     *
     * @param {Reporter} reporter An instance of reporter class, it must extends the "Reporter" class.
     *
     * @throws {InvalidArgumentException} If an invalid reporter class instance is given.
     */
    static addReporter(reporter){
        if ( !( reporter instanceof Reporter ) ){
            throw new InvalidArgumentException('Invalid reporter instance.', 1);
        }
        Logger._reporters.add(reporter);
    }

    /**
     * Removes a given reporter from the list of all the reporters messages will be reported through.
     *
     * @param {Reporter} reporter An instance of reporter class, it must extends the "Reporter" class.
     *
     * @throws {InvalidArgumentException} If an invalid reporter class instance is given.
     */
    static removeReporter(reporter){
        if ( !( reporter instanceof Reporter ) ){
            throw new InvalidArgumentException('Invalid reporter instance.', 1);
        }
        Logger._reporters.delete(reporter);
    }

    /**
     * Sets the reporters messages will be reported through.
     *
     * @param {?Set<Reporter>} reporters A set containing the reporters as class instances extending the "Reporter" class.
     *
     * @throws {InvalidArgumentException} If an invalid set of reporters is given.
     */
    static setReporters(reporters){
        if ( reporters !== null && !( reporters instanceof Set ) ){
            throw new InvalidArgumentException('Invalid reporters set.', 1);
        }
        Logger._reporters.clear();
        if ( reporters !== null ){
            for ( const reporter of reporters ){
                if ( reporter instanceof Reporter ){
                    Logger._reporters.add(reporter)
                }
            }
        }
    }

    /**
     * Drops all the reporters that have been defined.
     */
    static dropReporters(){
        Logger._reporters.clear();
    }

    /**
     * Returns all the reporters that have been defined.
     *
     * @returns {Set<Reporter>} s A set containing the reporters as class instances.
     */
    static getReporters(){
        return Logger._reporters;
    }

    /**
     * Sets if the application is in debug mode or not.
     *
     * @param {boolean} debug If set to "true" application logging will be set to debug.
     */
    static setDebug(debug){
        Logger._debug = debug === true;
    }

    /**
     * Returns if the application is in debug mode or not.
     *
     * @returns {boolean} If debug mode has been turned on will be returned "true".
     */
    static getDebug(){
        return Logger._debug === true;
    }

    /**
     * Logs a given message.
     *
     * @param {string} message A string containing the message to log.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid message is given.
     *
     * @async
     */
    static async log(message){
        if ( typeof message !== 'string' ){
            throw new InvalidArgumentException('Invalid message.', 1);
        }
        const processes = [];
        for ( const reporter of Logger._reporters ){
            processes.push(reporter.report(message));
        }
        await Promise.all(processes);
    }

    /**
     * Logs a given error.
     *
     * @param {Error} error An instance of the native class "Error" representing the error or the exception to log.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid "Error" instance is given.
     *
     * @async
     */
    static async logError(error){
        if ( !( error instanceof Error ) ){
            throw new InvalidArgumentException('Invalid error.', 1);
        }
        const processes = [];
        for ( const reporter of Logger._reporters ){
            processes.push(reporter.reportError(error));
        }
        await Promise.all(processes);
    }

    /**
     * Logs a given message allowing to define custom options for each reporter that will be triggered.
     *
     * @param {string} message A string containing the message to log.
     * @param {logCallback} callback The callback function to invoke in order to provide custom options.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid message is given.
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     *
     * @async
     */
    static async logWithOptions(message, callback){
        if ( typeof message !== 'string' ){
            throw new InvalidArgumentException('Invalid message.', 1);
        }
        if ( typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 2);
        }
        const processes = [];
        for ( const reporter of Logger._reporters ){
            let options = callback(reporter);
            if ( typeof options !== 'object' ){
                options = null;
            }
            if ( options === null || options.enable !== true ){
                processes.push(reporter.report(message, options));
            }
        }
        await Promise.all(processes);
    }

    /**
     * Logs a given error allowing to define custom options for each reporter that will be triggered.
     *
     * @param {Error} error An instance of the native class "Error" representing the error or the exception to log.
     * @param {logErrorCallback} callback The callback function to invoke in order to provide custom options.
     *
     * @return {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid "Error" instance is given.
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     *
     * @async
     */
    static async logErrorWithOptions(error, callback){
        if ( !( error instanceof Error ) ){
            throw new InvalidArgumentException('Invalid error.', 1);
        }
        if ( typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 2);
        }
        const processes = [];
        for ( const reporter of Logger._reporters ){
            let options = callback(reporter);
            if ( typeof options !== 'object' ){
                options = null;
            }
            if ( options === null || options.enable !== true ){
                processes.push(reporter.reportError(error, options));
            }
        }
        await Promise.all(processes);
    }
}

/**
 * @constant Signals the reported message is a fatal error.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(Logger, 'LEVEL_FATAL', {
    value: 'fatal',
    configurable: true,
    enumerable: true,
    writable: false
});

/**
 * @constant Signals the reported message is a standard error.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(Logger, 'LEVEL_ERROR', {
    value: 'error',
    configurable: true,
    enumerable: true,
    writable: false
});

/**
 * @constant Signals the reported message is a non fatal warning.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(Logger, 'LEVEL_WARNING', {
    value: 'warning',
    configurable: true,
    enumerable: true,
    writable: false
});

/**
 * @constant Signals the reported message is a info that doesn't affect program execution.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(Logger, 'LEVEL_INFO', {
    value: 'info',
    configurable: true,
    enumerable: true,
    writable: false
});

/**
 * @constant Signals the reported message contains some debug information.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(Logger, 'LEVEL_DEBUG', {
    value: 'debug',
    configurable: true,
    enumerable: true,
    writable: false
});

module.exports = Logger;
