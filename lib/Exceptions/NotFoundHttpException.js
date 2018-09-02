'use strict';

const Exception = require('./Exception');

class NotFoundHttpException extends Exception{
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = NotFoundHttpException;