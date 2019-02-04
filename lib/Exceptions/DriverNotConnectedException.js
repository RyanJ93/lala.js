'use strict';

const Exception = require('./Exception');

class DriverNotConnectedException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = DriverNotConnectedException;
