'use strict';

const Exception = require('./Exception');

class UnresolvedDependencyException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = UnresolvedDependencyException;
