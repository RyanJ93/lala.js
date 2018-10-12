'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Basic helpers', () => {
    describe('Loading all modules from a given directory path.', () => {
        it('Should load all classes from the directory "lib/Routing".', () => {
            let Router = require('../lib/Routing/Router');
            let artifacts = lala.requireDir('./lib/Routing');
            assert.equal(artifacts.Router, Router, 'Artifacts seem to have not been imported correctly.');
        });
    });
    it('Generate UUIDs.', () => {
        let uuid = lala.generateUUID(4, false);
        assert.strictEqual(new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i).test(uuid), true, 'The generated UUID does not match the test pattern.');
    });
});
