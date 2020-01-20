'use strict';

// Including Lala's modules.
const Logger = require('../Logger/Logger');

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
     * Logs this exception using the reporters defined in the "Logger" class.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    report(){
        return Logger.logError(this);
    }
}

module.exports = Exception;