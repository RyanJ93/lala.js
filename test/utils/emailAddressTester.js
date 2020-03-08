'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing email address tester.', () => {
    it('Checking if an email address esists.', async () => {
        const tester = new lala.EmailAddressTester('hey@lalajs.moe');
        const valid = await tester.test();
        const invalid = await tester.setEmail('undefined@lalajs.moe').test();
        const result = valid && !invalid;
        assert.deepStrictEqual(result, true);
    });
});
