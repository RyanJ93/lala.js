'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const Logger = require('../../Logger/Logger');
const ConsoleReporter = require('../../Logger/reporters/ConsoleReporter');
const FileReporter = require('../../Logger/reporters/FileReporter');

/**
 * This class allows to setup default reporters for the logger class.
 */
class LoggerProvider extends Provider {
    /**
     * Setups up default reporters for the logger class.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        FileReporter.setup(FileReporter.DEFAULT_LOG_PATH, 33554432);
        Logger.addReporter(new ConsoleReporter());
        Logger.addReporter(new FileReporter());
    }
}

module.exports = LoggerProvider;
