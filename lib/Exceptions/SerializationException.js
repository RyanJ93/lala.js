'use strict';

const Exception = require('./Exception');

class SerializationException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = SerializationException;
