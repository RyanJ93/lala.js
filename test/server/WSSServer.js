'use strict';

const assert = require('assert');
const WebSocket = require('ws');
const lala = require('../..');
const {
    fetchHTTPResponse,
    asyncListener
} = require('../utilities');

describe('Testing WebSocket (SSL) server capabilities.', () => {
    let server = null, clients = [];

    it('Starting a new WebSocket server.', async () => {
        server = new lala.WSSServer();
        server.setPort(11225).setSSLPort(11226);
        server.getWSConnectionProcessorFactory().setAllowAnonymousOrigin(true);
        const context = server.getTLSContext();
        context.setPrivateKey(__dirname + '/../resources/private.key', true);
        context.setCertificate(__dirname + '/../resources/certificate.crt', true);
        await server.start();
        server.setMessageController((message) => message.getMessage());
        clients[0] = new WebSocket('wss://127.0.0.1:11226', {
            rejectUnauthorized: false
        });
        await asyncListener(clients[0], 'open');
        clients[0].send('msg');
        const message = await asyncListener(clients[0], 'message');
        server.setMessageController(null);
        assert.deepEqual(message, 'msg');
    });

    it('Close the server.', async () => {
        await server.stop();
        const client = new WebSocket('wss://127.0.0.1:11226', {
            rejectUnauthorized: false
        });
        const error = await asyncListener(client, 'error');
        assert.deepEqual(error.code, 'ECONNREFUSED');
    });
});