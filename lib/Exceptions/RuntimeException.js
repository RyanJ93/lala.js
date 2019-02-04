'use strict';

const Exception = require('./Exception');

class RuntimeException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = RuntimeException;
