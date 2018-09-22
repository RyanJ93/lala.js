'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');

let config = {};
class Cluster{
    static async loadConfigurationFromFile(path){
        if ( path === '' || typeof(path) !== 'string' ){
            throw new InvalidArgumentException('Invalid config path.', 1);
        }
        try{
            let content = filesystem.readFileSync(path).toString();
            config = JSON.parse(content);
        }catch(ex){
            console.log(ex);
        }
    }

    static async writeConfig(){

    }
}

module.exports = Cluster;
