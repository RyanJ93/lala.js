'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing email utils.', () => {
    it('Checking email address syntax.', () => {
        const valid = lala.EmailUtils.validate('hey@lalajs.moe');
        const invalid = lala.EmailUtils.validate('hey@lalajs@moe');
        const result = valid && !invalid;
        assert.deepStrictEqual(result, true);
    });
});
