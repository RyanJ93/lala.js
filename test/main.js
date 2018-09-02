'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Global initialization', async () => {
    await lala.fallFromTheSky({
        config: 'test/config.json'
    });
    assert.deepEqual(lala.Config.getProperty('app.name'), 'Test', 'Loaded value mismatch, perhaps configuration has not been loaded successfully.');
    let database = null;
    await it('Connect the database (MongoDB)', async () => {
        database = lala.Database.getSystemConnection();
        assert.equal(database.constructor, lala.Database, 'Database seems to be connected successfully.');
    });
    if ( database !== null ){

    }
});
