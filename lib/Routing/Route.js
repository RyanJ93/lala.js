'use strict';

class Route{
    static supportedMethod(){

    }

    constructor(method, path, handler){
        this.method = method;
        this.path = path;
        this.handler = handler;
        this.parameters = [];
        this.optionalParameters = [];
    }
}

module.exports = Route;
