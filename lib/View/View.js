'use strict';

const ejs = require('ejs');

class View{
    constructor(path, data){
        this.path = path;
        this.data = data;
        this.content = null;
    }

    async render(){
        await ejs.renderFile(this.path, this.data, {

        }, async (error, content) => {console.log(error);
            if ( error ){

            }
            this.content = content;
        });
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
