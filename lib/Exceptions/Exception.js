'use strict';

// Including Lala's modules.
const { Logger } = require('../Logger');

/**
 * The base exception class.
 */
class Exception extends Error {
    /**
     * The class constructor.
     *
     * @param {string} message A string containing the exception error message.
     * @param {number} code An integer number representing the error code.
     * @param {*} exception An optional exception that will be chained in the exception stack trace.
     */
    constructor(message, code, exception){
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.code = code !== null && isNaN(code) === false ? code : 0;
    }

    /**
     * Returns the exception code.
     *
     * @returns {number} An integer number representing the error code, if no custom code has been defined, zero will be returned instead.
     */
    getCode(){
        return this.code;
    }

    /**
     * Sends the exception to an external error tracking system, if configured, this method is chainable.
     *
     * @returns {Exception}
     */
    report(){
        Logger.reportError(this);
        return this;
    }

    /**
     * Logs this exception using the built-in logger, this method is chainable.
     *
     * @param {number} [level=1] An integer number greater than zero representing the error severity.
     * @param {boolean} [report=false] If set to "true", the exception will be sent to an external error tracking system.
     *
     * @returns {Exception}
     */
    log(level = 1, report = false){
        if ( report === true ){
            this.report();
            return this;
        }
        Logger.log(this.message, level);
        return this;
    }
}

module.exports = Exception;