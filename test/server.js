'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Server', () => {
    let server = null;
    it('Creating a server.', () => {
        server = new lala.Server('test');
        assert.equal(server.constructor.name, 'Server', 'Server created successfully.');
    });
    it('Picking a random port.', () => {
        lala.Server.getRandomPort();
    });
    it('Starting the main server.', () => {

    });
});
