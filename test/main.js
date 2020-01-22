'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Global initialization', async () => {
    it('Load configuration from a given configuration file.', async () => {
        await lala.fallFromTheSky({
            config: './test/resources/config.json'
        });
        assert.deepEqual(lala.Config.getProperty('app.name'), 'Test', 'Loaded value mismatch, perhaps configuration has not been loaded successfully.');
    });
});
