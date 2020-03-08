'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing buffer utils.', () => {
    it('Splitting a buffer into pieces.', () => {
        const sample = Buffer.from('1,2,3,4');
        const pieces = lala.BufferUtils.split(sample, Buffer.from(','));
        const elements = pieces.map((piece) => piece.toString());
        assert.deepStrictEqual(elements, ['1', '2', '3', '4']);
    });
});
