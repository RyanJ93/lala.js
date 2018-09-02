'use strict';

class Exception extends Error{
    constructor(message, code, exception){
        super(message);
        this.code = code !== null && isNaN(code) === false ? code : 0;
    }

    getCode(){
        return this.code;
    }
}

module.exports = Exception;