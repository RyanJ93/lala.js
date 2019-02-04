'use strict';

const assert = require('assert');
const lala = require('../..');

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
    it('Creating an HTTP server.', () => {
        let server = new lala.Server('com.lala.test.server.http');
        let port = server.useRandomPort();
        server.setType('http').start();
        console.log('Server started on port ' + port);
        server.stop();
    });
    it('Creating an HTTPS server.', () => {
        let server = new lala.Server('com.lala.test.server.https');
        let port = server.useRandomPort();
        server.setType('https').setCertificateFileSync('./test/resources/cert.pem');
        server.setPrivateKeyFileSync('./test/resources/key.pem').setPassPhrase('passphrase').start();
        console.log('Server started on port ' + port);
        server.stop();
    });
    it('Creating a WebSocket server.', () => {
        let server = new lala.Server('com.lala.test.server.ws');
        let port = server.useRandomPort();
        server.setType('ws').start();
        console.log('Server started on port ' + port);
        server.stop();
    });
    it('Creating a WebSocket with TLS support server.', () => {
        let server = new lala.Server('com.lala.test.server.wss');
        let port = server.useRandomPort();
        server.setType('wss').setCertificateFileSync('./test/resources/cert.pem');
        server.setPrivateKeyFileSync('./test/resources/key.pem').setPassPhrase('passphrase').start();
        console.log('Server started on port ' + port);
        server.stop();
    });
    it('Creating an HTTP server listening on a UNIX sock.', () => {
        let server = new lala.Server('com.lala.test.server.sock');
        server.setPath('./test/resources/server_test.sock').setType('sock').start();
        server.stop();
    });
});
