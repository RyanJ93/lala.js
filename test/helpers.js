'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Basic helpers', () => {
    describe('Loading all modules from a given directory path.', () => {
        it('Should load all classes from the directory "lib/Routing".', () => {
            let Router = require('../lib/Routing/Router');
            let artifacts = lala.requireDir('lib/Routing');
            assert.equal(artifacts.Router, Router, 'Artifacts seem to have not been imported correctly.');
        });
    });
});