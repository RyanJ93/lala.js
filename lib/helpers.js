'use strict';

// Including native modules.
const filesystem = require('fs');

/**
 * Generates an UUID according to the given version number.
 *
 * @param {number} version An integer number greater than zero an lower or equal than 5 representing the UUID version, if an invalid version is given, an UUID verion 4 will be generated instead.
 * @param {boolean} secure If set to "true", UUID's digits will be generated as cryptographically secure, otherwise not.
 *
 * @return {string} A string containing the generated UUID.
 */
module.exports.generateUUID = function(version, secure){
    switch ( version ){
        default:{
            // Generating an UUID version 4.
            let components = ['', '', '4', '', ''];
            let values = ['8', '9', 'a', 'b'];
            components[3] = values[Math.floor(Math.random() * 4)];
            return [8, 4, 3, 3, 12].map((element, index) => {
                for ( let i = 0 ; i < element ; i++ ){
                    components[index] += Math.floor(Math.random() * 16).toString(16);
                }
                return components[index];
            }).join('-');
        };
    }
};

/**
 * Loads all the modules found within a given directory.
 *
 * @param {string} path A string containing the directory path.
 * @param {boolean?} recursive If set to "true" it means that all subdirectory found will be included too.
 *
 * @return {object} An object containing all the artifacts found.
 */
module.exports.requireDir = function(path, recursive){
    let artifacts = {};
    filesystem.readdirSync(path).forEach((element) => {
        if ( element.substr(element.lastIndexOf('.') + 1).toLowerCase() === 'js' ){
            let imports = require('.' + path + '/' + element);
            switch ( typeof(imports) ){
                case 'object':{
                    if ( imports !== null ){
                        artifacts = Object.assign(artifacts, imports);
                    }
                }break;
                case 'function':{
                    artifacts[imports.name] = imports;
                }break;
            }
        }else if ( recursive === true && filesystem.lstatSync(path + '/' + element).isDirectory() === true ){
            let imports = requireDir(path + '/' + element, true);
            artifacts = Object.assign(artifacts, imports);
        }
    });
    return artifacts;
};

