'use strict';

const filesystem = require('fs');

/**
 * Loads all the modules found within a given directory.
 *
 * @param {string} path A string containing the directory path.
 * @param {boolean?} recursive If set to "true" it means that all subdirectory found will be included too.
 *
 * @return {object} An object containing all the artifacts found.
 */
function requireDir(path, recursive){
    let artifacts = {};
    if ( path.charAt(0) !== '/' && path.substr(0, 2) !== './' ){
        path = './' + path;
    }
    filesystem.readdirSync(path).forEach((element) => {
        if ( element.substr(element.lastIndexOf('.') + 1).toLowerCase() === 'js' ){
            let imports = require(path + '/' + element);
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
}

async function fallFromTheSky(options){
    if ( options === null || typeof(options) !== 'object' ){
        options = {};
    }
    await module.exports.Config.loadFromFile(options.config);
    await module.exports.Database.initFromConfig();
}

module.exports = requireDir('lib', true);
module.exports.requireDir = requireDir;
module.exports.fallFromTheSky = fallFromTheSky;
