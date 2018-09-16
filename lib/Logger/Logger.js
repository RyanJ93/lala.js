'use strict';

// Including Lala's modules.
const Config = require('../Config/Config');

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
