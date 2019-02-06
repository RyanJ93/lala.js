'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const {
    InvalidArgumentException,
    RuntimeException,
    ParseException
} = require('../Exceptions');

/**
 * @type {{string: *}}
 *
 * @private
 */
let _config = {};

/**
 * Handle the framework configuration.
 */
class Config {
    /**
     * Load the configuration parameters from a given JSON file.
     *
     * @param {string} path A string containing the path to the configuration file.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid path is passed.
     * @throws {RuntimeException} If an error occurs while reading the configuration file contents.
     * @throws {ParseException} If an error occurs while parsing the loaded file as JSON encoded data.
     *
     * @async
     */
    static async loadFromFile(path){
        if ( path === '' || typeof(path) !== 'string' ){
            throw new InvalidArgumentException('Invalid config path.', 1);
        }
        await (new Promise((resolve, reject) => {
            // Fetch the configuration file contents.
            filesystem.readFile(path, (error, content) => {
                if ( error !== null ){
                    return reject(new RuntimeException('An error occurred while reading the configuration file.', 2, error));
                }
                try{
                    _config = JSON.parse(content.toString());
                    resolve();
                }catch(ex){
                    return reject(new ParseException('The loaded configuration file appears to be a non-valid JSON file.', 3, ex));
                }
            });
        }));
    }

    /**
     * Returns a property from the loaded configuration file.
     *
     * @param {string} identifier A string representing the property name, use dot to separate levels in hierarchy, for instance "app.name" => {app: {name: "Your name."}}.
     *
     * @returns {*} The value corresponding to the given identifier fetched from the loaded configuration file.
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     */
    static getProperty(identifier){
        if ( identifier === '' || typeof(identifier) !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        const levels = identifier.split('.');
        const length = levels.length;
        let buffer = _config;
        // Navigate the configuration block hierarchy.
        for ( let i = 0 ; i < length ; i++ ){
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
