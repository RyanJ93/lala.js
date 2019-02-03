'use strict';

// Including Lala's modules.
const Config = require('../Config/Config');

let sentry = null;

let verbose = false;
class Logger {
    /**
     * Instantiates the logger according to the configuration file loaded.
     */
    static initFromConfig(){
        // Grab the configuration blog from the loaded configuration file.
        let config = Config.getProperty('logger');
        if ( config === null ){
            return;
        }
        verbose = config.verbose === true;
        if ( config.sentry !== null && typeof config.sentry === 'object' && config.sentry.enable === true ){
            if ( config.sentry.dns !== '' && typeof config.sentry.dns === 'string' ){
                try{
                    // Try to include the Sentry's SDK.
                    sentry = require('@sentry/node');
                    sentry.init({
                        dns: config.sentry.dns
                    });
                }catch(ex){
                    // Disable Sentry if an error occurs while requiring the module.
                    sentry = null;
                    if ( verbose === true ){
                        console.log('In order to use Sentry, you must install its SDK first, run "npm install @sentry/node".');
                    }
                }
            }
        }
    }

    /**
     * Checks if Sentry has been configured and if it is available.
     *
     * @return {boolean} If Sentry is available will be returned "true", otherwise "false".
     */
    static sentryAvailable(){
        return sentry !== null;
    }

    /**
     * Checks if the app has been configured in verbose mode.
     *
     * @return {boolean} If the app has been configured in verbose mode will be returned "true", otherwise "false".
     */
    static isVerbose(){
        return verbose === true;
    }

    /**
     * Reports an exception according to the defined reporting settings.
     *
     * @param {Error|string} exception An instance of the class "Error" or another class extending it representing the error or exception to report.
     */
    static reportError(exception){
        if ( Logger.sentryAvailable() ){
            // Send the exception to Sentry.
            if ( typeof exception === 'string' ){
                sentry.captureMessage(exception);
            }else{console.log(sentry);
                sentry.captureException(exception);
            }
        }
        if ( Logger.isVerbose() ){
            console.log('\x1b[41m%s\x1b[0m', exception);
        }
    }

    static log(message, level = 1){
        if ( Logger.isVerbose() ){
            console.log(message);
        }
    }
}

module.exports = Logger;
