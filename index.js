'use strict';

const filesystem = require('fs');

// Including exceptions.
let exceptions = require('./lib/Exceptions');
module.exports.Exception = exceptions.Exception;
module.exports.InvalidArgumentException = exceptions.InvalidArgumentException;
module.exports.NotFoundHttpException = exceptions.NotFoundHttpException;

// Including built-in modules.
module.exports.Command = require('./lib/Command').Command;
module.exports.Config = require('./lib/Config').Config;
module.exports.Database = require('./lib/Database').Database;
module.exports.Logger = require('./lib/Logger').Logger;
let model = require('./lib/Model');
module.exports.Model = model.Model;
module.exports.User = model.User;
module.exports.Peke = require('./lib/ORM').Peke;
module.exports.Router = require('./lib/Routing').Router;
let server = require('./lib/Server');
module.exports.Server = server.Server;
module.exports.Request = server.Request;
module.exports.View = require('./lib/View').View;

// Exporting build-in helpers.
module.exports.requireDir = requireDir;
module.exports.fallFromTheSky = fallFromTheSky;

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
    await module.exports.Server.initFromConfig();
    await module.exports.Logger.initFromConfig();
}

process.on('uncaughtException', (error) => {
    module.exports.Logger.reportError(error);
});
process.on('unhandledRejection', (error) => {
    module.exports.Logger.reportError(error);
});
