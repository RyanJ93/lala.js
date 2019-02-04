'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Basic helpers', () => {
    it('Should load all classes from the directory "lib/Routing".', () => {
        let Router = require('../../lib/Routing/Router');
        let artifacts = lala.requireDir('./lib/Routing');
        assert.equal(artifacts.Router, Router, 'Artifacts seem to have not been imported correctly.');
    });

    it('Generate UUIDs.', () => {
        let uuid = lala.generateUUID(4, false);
        assert.strictEqual(new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i).test(uuid), true, 'The generated UUID does not match the test pattern.');
    });

    describe('Data serialization.', () => {
        let data = {
            a: 'This is a string',
            b: 234,
            c: 12.566,
            d: undefined,
            e: null,
            f: true,
            g: false,
            // l: BigInt('555')
        };
        data.h = Object.assign({}, data);
        data.i = [1, 2.3, 'dd', null, 'End', /* BigInt('344432232') */];

        it('Data serialization into JSON string.', () => {
            let serialization = lala.serialize(data);
           //console.log(serialization);
        });

        it('Data restore from a JSON serialized string.', () => {

        });
    });
});
