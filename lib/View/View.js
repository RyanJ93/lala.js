'use strict';

// Including dependencies.
const ejs = require('ejs');

class View{
    constructor(path, data){
        this.path = path;
        this.data = data;
        this.content = null;
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
