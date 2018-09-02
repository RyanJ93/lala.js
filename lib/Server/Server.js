'use strict';

const http = require('http');
const Config = require('../Config/Config');
const Router = require('../Routing/Router');
const InvalidArgumentException = require('../exceptions/InvalidArgumentException');

let servers = {};
class Server{
    static async initFromConfig(){
        let entries = Config.getProperty('servers');
        if ( entries === null || typeof entries !== 'object' ){
            return this;
        }
        for ( let name in entries ){
            if ( typeof entries[name].port === 'number' && entries[name].port !== null && entries[name].port > 0 && entries[name].port <= 65535 ){
                let server = new Server();
                server.setPort(Math.floor(entries[name].port));
                if ( entries[name].bind !== '' && typeof entries[name].bind === 'string' ){
                    server.setBind(entries[name].bind);
                }
                if ( entries[name].type !== '' && typeof entries[name].type === 'string' ){
                    server.setType(entries[name].type);
                }
                server.start();
                servers[name] = server;
            }
        }
        return this;
    }

    constructor(){
        this.name = 'default';
        this.type = null;
        this.bind = null;
        this.port = null;
        this.routers = ['web'];
        this.server = null;
    }

    setName(name){
        //
        this.name = name;
        return this;
    }

    getName(){
        return this.name;
    }

    setType(type){
        if ( typeof(type) !== 'string' || type === '' ){
            throw new InvalidArgumentException('Invalid type.');
        }
        this.type = type;
        return this;
    }

    getType(){
        return this.type;
    }

    setBind(bind){
        //
        this.bind = bind;
        return this;
    }

    getBind(){
        return this.bind;
    }

    setPort(port){
        //
        this.port = port;
        return this;
    }

    getPort(){
        return this.port;
    }

    start(handler){
        switch (this.type){
            case 'http':{
                this.server = http.createServer(async (request, handler) => {
                    if ( typeof(handler) === 'function' ){
                        return handler.call(this, request, handler);
                    }
                    await Server.defaultHandler(request, handler);
                });
                this.server.on('error', function (e) {
                    // Handle your error here
                    console.log(e);
                });
                this.server.listen(this.port);
            }break;
        }
    }

    static async defaultHandler(request, handler){
        await Router.handle(request, handler);
    }
}

module.exports = Server;
