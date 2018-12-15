'use strict';

const Exception = require('./Exception');

class UnsupportedMethodException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = UnsupportedMethodException;
