'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing built-in helper functions.', () => {
    it('Generate UUIDs.', () => {
        const uuid = lala.helpers.generateUUID(4, false);
        const pattern = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
        assert.strictEqual(pattern.test(uuid), true);
    });

    it('Generate a random token.', async () => {
        const token = await lala.helpers.generateToken(32);
        assert.strictEqual(token.length, 32);
    });

    it('Serialize some data.', () => {
        const data = {
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
        const serialization = lala.helpers.serialize(data);
        const expected = '{"a":"This is a string","b":234,"c":12.566,"e":null,"f":true,"g":false,"h":{"a":"This is a string","b":234,"c":12.566,"e":null,"f":true,"g":false},"i":[1,2.3,"dd",null,"End"]}';
        assert.strictEqual(serialization.value, expected);
    });

    it('Checking if an object is empty.', () => {
        const nonEmptyObj = {a: 1};
        const emptyObj = {};
        const result = !lala.helpers.isEmptyObject(nonEmptyObj) && lala.helpers.isEmptyObject(emptyObj);
        assert.strictEqual(result, true);
    });
});
