'use strict';

const Exception = require('./Exception');

class NotFoundException extends Exception {
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = NotFoundException;