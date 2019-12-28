'use strict';

// Including Lala's modules.
const Config = require('../Config/Config');

/**
 * @type {(object|null)} _sentry An object representing the Sentry SDK installed as third part module, if the module cannot be included, it will be set to null.
 *
 * @private
 */
let _sentry = null;

/**
 * @type {boolean} _verbose If set to "true" all the log messages will be shown in the console and written in log files.
 *
 * @private
 */
let _verbose = false;

/**
 * This class allows to report log messages and errors in all the supported ways.
 */
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
        _verbose = config.verbose === true;
        if ( config.sentry !== null && typeof config.sentry === 'object' && config.sentry.enable === true ){
            if ( config.sentry.dns !== '' && typeof config.sentry.dns === 'string' ){
                try{
                    // Try to include the Sentry's SDK.
                    _sentry = require('@sentry/node');
                    _sentry.init({
                        dns: config.sentry.dns
                    });
                }catch{
                    // Disable Sentry if an error occurs while requiring the module.
                    _sentry = null;
                    if ( _verbose === true ){
                        console.log('In order to use Sentry, you must install its SDK first, run "npm install @sentry/node".');
                    }
                }
            }
        }
    }

    static setSentryDNS(dns){
        if ( _sentry === null ){
            _sentry = require('@sentry/node');
        }
        _sentry.init({
            dns: dns
        });
    }

    /**
     * Checks if Sentry has been configured and if it is available.
     *
     * @return {boolean} If Sentry is available will be returned "true", otherwise "false".
     */
    static sentryAvailable(){
        return _sentry !== null;
    }

    /**
     * Checks if the app has been configured in verbose mode.
     *
     * @return {boolean} If the app has been configured in verbose mode will be returned "true", otherwise "false".
     */
    static isVerbose(){
        return _verbose === true;
    }

    /**
     * Reports an exception according to the defined reporting settings.
     *
     * @param {(Error|string)} exception An instance of the class "Error" or another class extending it representing the error or exception to report.
     */
    static reportError(exception){
        if ( Logger.sentryAvailable() ){console.log(exception);
            // Send the exception to Sentry.
            if ( typeof exception === 'string' ){
                _sentry.captureMessage(exception);
            }else{
                _sentry.captureException(exception);
            }
        }
        if ( Logger.isVerbose() ){
            console.log('\x1b[41m%s\x1b[0m', exception);
        }
    }

    /**
     * Logs a given message in all the configured channels according to the verbosity setting.
     *
     * @param {string} message A string containing the message to log.
     * @param {number} [level=1] An integer number representing the message severity level.
     */
    static log(message, level = 1){
        if ( Logger.isVerbose() ){
            console.log(message);
        }
    }
}

module.exports = Logger;
