'use strict';

const Exception = require('./Exception');

class BadMethodCallException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = BadMethodCallException;
