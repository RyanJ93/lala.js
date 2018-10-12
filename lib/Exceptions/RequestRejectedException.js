'use strict';

const Exception = require('./Exception');

class RequestRejectedException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = RequestRejectedException;
