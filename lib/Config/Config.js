'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');

let config = {};
class Config{
    /**
     * Load the configuration parameters from a given JSON file.
     *
     * @param {string} path A string containing the path to the configuration file.
     *
     * @returns {Promise<void>}
     *
     * @throws InvalidArgumentException If an invalid path is passed.
     *
     * @async
     */
    static async loadFromFile(path){
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

    /**
     * Returns a property from the loaded configuration file.
     *
     * @param {string} identifier A string representing the property name, use dot to separate levels in hierarchy, for instance "app.name" => {app: {name: "Your name."}}.
     */
    static getProperty(identifier){
        if ( identifier === '' || typeof(identifier) !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        let levels = identifier.split('.');
        let buffer = config;
        for ( let i = 0 ; i < levels.length ; i++ ){
            if ( typeof(buffer[levels[i]]) !== 'undefined' ){
                buffer = buffer[levels[i]];
                continue;
            }
            return null;
        }
        return buffer;
    }
}

module.exports = Config;
