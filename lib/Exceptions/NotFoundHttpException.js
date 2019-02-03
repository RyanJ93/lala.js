'use strict';

const NotFoundException = require('./NotFoundException');

class NotFoundHttpException extends NotFoundException {
    constructor(message, code, exception){
        super(message, code, exception);
    }
}

module.exports = NotFoundHttpException;