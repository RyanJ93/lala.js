'use strict';

const Exception = require('./Exception');

class NotCallableException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = NotCallableException;
