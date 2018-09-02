'use strict';

const Exception = require('./Exception');

class InvalidArgumentException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = InvalidArgumentException;