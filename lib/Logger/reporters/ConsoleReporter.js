'use strict';

// Including Lala's modules.
const Reporter = require('./Reporter');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements logging through built-in console.
 */
class ConsoleReporter extends Reporter {
    /**
     * Prints out a given message or error to the console.
     *
     * @param {(string|Error)} message A string or an error object representing the message to show.
     * @param {string} level A string containing the name of the verbosity level to use.
     * @param {string} defaultLevel A string containing the name of the default verbosity to use if the other one is unsupported.
     *
     * @protected
     */
    _log(message, level, defaultLevel){
        let reported = false;
        switch ( level ){
            case 'fatal':
            case 'error': {
                console.error(ConsoleReporter._getCurrentDate(), message);
                reported = true;
            }break;
            case 'warning': {
                console.warn(ConsoleReporter._getCurrentDate(), message);
                reported = true;
            }break;
            case 'info': {
                console.info(ConsoleReporter._getCurrentDate(), message);
                reported = true;
            }break;
            case 'debug': {
                console.debug(ConsoleReporter._getCurrentDate(), message);
                reported = true;
            }break;
        }
        if ( !reported ){
            // The given verbosity level is not supported, using the default one given.
            this._log(message, defaultLevel, defaultLevel);
        }
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
     * @param {?ReportOptions} [options] An object containing some additional option the method should take care of.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid message is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     *
     * @async
     */
    async report(message, options = null){
        if ( typeof message !== 'string' ){
            throw new InvalidArgumentException('Invalid message.', 1);
        }
        if ( options === null ){
            options = {};
        }else if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 2);
        }
        const level = typeof options.level === 'string' ? options.level : 'info';
        this._log(message, level, 'info');
    }

    /**
     * Reports a given error.
     *
     * @param {Error} error The error or the exception to report.
     * @param {?ErrorReportOptions} [options] An object containing some additional option the method should take care of.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid instance of the class "Error" is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     *
     * @async
     */
    async reportError(error, options = null){
        if ( !( error instanceof Error ) ){
            throw new InvalidArgumentException('Invalid error.', 1);
        }
        if ( options === null ){
            options = {};
        }else if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 2);
        }
        const level = typeof options.level === 'string' ? options.level : 'error';
        this._log(error, level, 'error');
    }
}

module.exports = ConsoleReporter;
