'use strict';

const { Config } = require('../../index');

let verbose = false;
class Logger {
    static initFromConfig(){
        verbose = Config.getProperty('verbose') === true;
    }

    static isVerbose(){
        return verbose === true;
    }

    static reportError(exception){
        if ( Logger.isVerbose() ){
            console.log(exception);
        }
    }
}

module.exports = Logger;
