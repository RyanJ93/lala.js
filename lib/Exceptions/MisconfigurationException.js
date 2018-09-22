'use strict';

const Exception = require('./Exception');

class MisconfigurationException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = MisconfigurationException;
