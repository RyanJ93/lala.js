'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including dependencies.
const ejs = require('ejs');

class View{
    constructor(path, data){
        this.path = path;
        this.data = data;
        this.content = null;
    }

    setData(data){
        this.data = data;
        return this;
    }

    getData(){
        return this.data;
    }

    async render(){
        return await (new Promise((resolve, reject) => {
            ejs.renderFile(this.path, this.data, {}, (error, content) => {
                if ( error ){
                    return reject(error);
                }
                this.content = content;
                resolve(content);
            });
        }));
    }

    async renderAsStream(){
        const content = await this.render();
        const stream = new Readable();
        stream.push(content);
        stream.push(null);
        return stream;
    }

    async print(handler){
        if ( this.content === null ){
            await this.render();
        }
        handler.writeHead(200, {
            'Content-Type': 'text/html'
        });
        handler.write(this.content);
        handler.end();
    }
}
module.exports = View;
