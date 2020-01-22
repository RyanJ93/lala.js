'use strict';

const assert = require('assert');
const filesystem = require('fs');
const lala = require('../..');
const { removeDirectory } = require('../utilities');

describe('Testing logging system.', () => {
    it('Defining and triggering a custom reporter.', async () => {
        let reportedMessage = null;
        class TestReporter extends lala.reporters.Reporter {
            async report(message){
                reportedMessage = message;
            }
        }
        lala.Logger.dropReporters();
        lala.Logger.addReporter(new TestReporter());
        await lala.Logger.log('Test message.');
        assert.deepEqual(reportedMessage, 'Test message.');
    });

    it('Writing a log to file.', async () => {
        removeDirectory('./test/resources/logs');
        lala.reporters.FileReporter.setup('./test/resources/logs/main.log');
        lala.Logger.dropReporters();
        lala.Logger.addReporter(new lala.reporters.FileReporter());
        await lala.Logger.log('Test message.');
        const contents = filesystem.readFileSync('./test/resources/logs/main.log').toString();
        const result = contents.indexOf('Test message.') > 0;
        assert.deepEqual(result, true);
    });

    it('Writing a log to another file.', async () => {
        removeDirectory('./test/resources/logs');
        lala.reporters.FileReporter.setup('./test/resources/logs/main.log');
        lala.Logger.dropReporters();
        lala.Logger.addReporter(new lala.reporters.FileReporter());
        await lala.Logger.logWithOptions('Test message.', () => {
            return {
                path: './test/resources/logs/sub/another_file.log'
            };
        });
        const contents = filesystem.readFileSync('./test/resources/logs/sub/another_file.log').toString();
        const result = contents.indexOf('Test message.') > 0;
        assert.deepEqual(result, true);
    });

    it('Using log rotation when logging a message to file.', async () => {
        removeDirectory('./test/resources/logs');
        lala.reporters.FileReporter.setup('./test/resources/logs/main.log', 50);
        lala.Logger.dropReporters();
        lala.Logger.addReporter(new lala.reporters.FileReporter());
        await lala.Logger.log('This message will be log to the first file.');
        await lala.Logger.log('This message should be logged to a new file as 50 bytes limit has been exceeded.');
        assert.deepEqual(filesystem.existsSync('./test/resources/logs/main.log.0.tar.gz'), true);
    });
});
