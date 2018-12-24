'use strict';

const Exception = require('./Exception');

class ParseException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = ParseException;
