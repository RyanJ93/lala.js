'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing DNS utils.', () => {
    it('Resolving a domain name.', async () => {
        const records = await lala.DNSUtils.resolve('nodejs.org', 'A');
    });
});
