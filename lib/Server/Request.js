'use strict';

const filesystem = require('fs');

class Request{
    constructor(request, handler){
        this.handler = handler;
        if ( request !== null && typeof request === 'object' ){
            return Object.assign(this, request);
        }
    }

    throwHTTPError(code){
        switch ( code ){
            case 404:{
                this.handler.writeHead(404, 'Not found', {
                    'Content-Type': 'text/html'
                });
                if ( filesystem.existsSync('../resources/views/error.404.html') ){
                    try{
                        let content = filesystem.readFileSync('../resources/views/error.404.html').toString();
                        this.handler.write(content);
                    }catch(ex){console.log(ex);
                        this.handler.write('Not found.');
                    }finally{
                        this.handler.end();
                    }
                    return;
                }
                this.handler.write('Not found.');
                this.handler.end();
                return;
            }
        }
    }
}

module.exports = Request;
