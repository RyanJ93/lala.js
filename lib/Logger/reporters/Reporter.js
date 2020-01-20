'use strict';

// Including Lala's modules.
const {
    NotCallableException,
    RuntimeException
} = require('../../Exceptions');

/**
 * @typedef {Object} BaseReportOptions An object containing all the options accepted by all the reporting methods.
 *
 * @property {boolean} [enable=true] If set to "false" the message shouldn't be sent through the reporter this option is applied to (available using the Logger.logWithOptions and Logger.logErrorWithOptions methods).
 */

/**
 * @typedef {BaseReportOptions} ReportOptions An object containing all the options accepted by the "report" method.
 *
 * @property {string} [level="info"] A string containing the name of the verbosity level to use to report the message, one of the LEVEL_* constant available in the "Logger" class should be used.
 */

/**
 * @typedef {BaseReportOptions} ErrorReportOptions An object containing all the options accepted by the "reportError" method.
 *
 * @property {string} [level="error"] A string containing the name of the verbosity level to use to report the message, one of the LEVEL_* constant available in the "Logger" class should be used.
 */

/**
 * Allows to implement reporters, basically classes used to report given logs to some services.
 *
 * @abstract
 */
class Reporter {
    /**
     * Returns a string containing current date.
     *
     * @return {string} A string containing current date.
     */
    static _getCurrentDate(){
        const date = new Date();
        return date.getFullYear() + '/' + ( date.getMonth() + 1 ) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ', ' + date.getMilliseconds();
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Reporter' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Reports a given message.
     *
     * @param {string} message A string containing the message to report.
     * @param {?ReportOptions} [options] An object containing some additional option the method should take care of.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async report(message, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Reports a given error.
     *
     * @param {Error} error The error or the exception to report.
     * @param {?ErrorReportOptions} [options] An object containing some additional option the method should take care of.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async reportError(error, options){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Reporter;
