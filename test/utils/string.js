'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing string utils.', () => {
    it('Converting a regex from string representation into RegExp object.', () => {
        const regexString = '/[0-9]+/g';
        const regex = lala.StringUtils.toRegExp(regexString);
        const result = regex.test('123') && !regex.test('abc');
        assert.deepStrictEqual(result, true);
    });
});
