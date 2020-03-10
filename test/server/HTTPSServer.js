'use strict';

const assert = require('assert');
const filesystem = require('fs');
const lala = require('../..');
const {
    fetchHTTPResponse,
    attachBasicRoutes
} = require('../utilities');

describe('Testing HTTPS server capabilities.', () => {
    let server = null, router = null;

    it('Starting a new HTTPS server.', async () => {
        server = new lala.HTTPSServer();
        server.setPort(11233).setSSLPort(11234).setRedirect(false);
        const context = server.getTLSContext();
        context.setPrivateKey(__dirname + '/../resources/private.key', true);
        context.setCertificate(__dirname + '/../resources/certificate.crt', true);
        router = attachBasicRoutes(server);
        await server.start();
        const data = await Promise.all([
            fetchHTTPResponse('http://127.0.0.1:11233/'),
            fetchHTTPResponse('https://127.0.0.1:11234/', {
                rejectUnauthorized: false
            })
        ]);
        const result = data[0].body === 'OK' && data[1].body === 'OK';
        assert.deepEqual(result, true);
    });

    it('Redirect non secure connections to the HTTPS server.', async () => {
        server.setRedirect(true);
        const response = await fetchHTTPResponse('http://127.0.0.1:11233/', {
            followRedirect: false
        });
        assert.deepEqual(response.statusCode, 308);
    });

    it('Picking a different certificate according to the hostname.', async () => {
        // subdomain.lalajs.local
        const context = server.getTLSContext('subdomain.lalajs.local');
        context.setPrivateKey(__dirname + '/../resources/subdomain.private.key', true);
        context.setCertificate(__dirname + '/../resources/subdomain.certificate.crt', true);
        await server.restart(true);
        const response = await fetchHTTPResponse('https://subdomain.lalajs.local:11234/', {
            rejectUnauthorized: false
        });
        const certificate = response.req.socket.getPeerCertificate();
        assert.deepEqual(certificate.subjectaltname, 'DNS:subdomain.lalajs.local');
    });

    it('Request a client certificate.', async () => {
        const context = server.getTLSContext('subdomain.lalajs.local');
        context.setCACertificate(__dirname + '/../resources/ca.pem', true);
        context.setRequestCert(true).setRejectUnauthorized(false);
        await server.restart(true);
        const response = await fetchHTTPResponse('https://subdomain.lalajs.local:11234/', {
            rejectUnauthorized: false,
            cert: filesystem.readFileSync(__dirname + '/../resources/client.crt'),
            key: filesystem.readFileSync(__dirname + '/../resources/client.key')
        });
        const result = response.statusCode === 200 && response.body === 'OK';
        assert.deepEqual(result, true);
    });
/*
    it('Request a client certificate and validate it.', async () => {
        // TODO
        router.get('/ssl-auth', (request, response) => {
            // const cert = request.connection.getPeerCertificate();
            return 'OK';
        });
        const certRoot = __dirname + '/../resources/certificates/client/';
        const context = server.getTLSContext('auth.lalajs.local');
        context.setCACertificate(certRoot + 'ca.cer').setPasshrase('test');
        context.setCertificate(certRoot + 'server.cer').setPrivateKey(certRoot + 'server.key').setRejectUnauthorized(true);
        await server.restart(true);
        const validRequest = await fetchHTTPResponse('https://subdomain.lalajs.local:11234/ssl-auth', {
            rejectUnauthorized: false,
            cert: filesystem.readFileSync(certRoot + 'client.cer'),
            key: filesystem.readFileSync(certRoot + 'client.key'),
            passphrase: 'test',
            ca: filesystem.readFileSync(certRoot + 'ca.cer')
        });
        const invalidRequest = await fetchHTTPResponse('https://subdomain.lalajs.local:11234/ssl-auth', {
            rejectUnauthorized: false,
            cert: filesystem.readFileSync(__dirname + '/../resources/certificates/other_client/other_client.cer'),
            key: filesystem.readFileSync(__dirname + '/../resources/certificates/other_client/other_client.key'),
            passphrase: 'test',
            ca: filesystem.readFileSync(__dirname + '/../resources/certificates/other_client/other_ca.cer')
        });
        const result = validRequest.statusCode === 200 && validRequest.body === 'OK' && invalidRequest.statusCode === 403;
        assert.deepEqual(result, true);
    });

    it('Using a revoked client certificate', async () => {
        // TODO
        const context = server.getTLSContext('subdomain.lalajs.local');
        context.setCertificateRevocationList('');
        await server.restart(true);
        const response = await fetchHTTPResponse('https://subdomain.lalajs.local:11234/', {
            rejectUnauthorized: false,
            cert: filesystem.readFileSync(__dirname + '/../resources/client.crt'),
            key: filesystem.readFileSync(__dirname + '/../resources/client.key')
        });
        const result = response.statusCode === 200 && response.body === 'OK';
        assert.deepEqual(result, true);
    });

    it('Checking event chaining.', async () => {
        // TODO
        let count = 0;
        router.get('/event', () => {});
        const connection = fetchHTTPResponse('https://127.0.0.1:11234/event');
        server.on('request.preprocess', () => count++);
        server.on('request.prepare', () => count++);
        server.on('request.cookiePreparation', () => count++);
        server.on('request.sessionPreparation', () => count++);
        server.on('request.routeResolution', () => count++);
        server.on('request.authorization', () => count++);
        server.on('request.routeProcess', () => count++);
        server.on('request.outputProcess', () => count++);
        server.on('request.cleanup', () => count++);
        server.on('request.cleanupComplete', () => count++);
        await connection;
        assert.deepEqual(count, 10);
    });
*/
    it('Stopping the server.', async () => {
        await server.stop();
        let exception = null;
        try{
            await fetchHTTPResponse('http://127.0.0.1:11233/', {
                timeout: 3000
            });
        }catch(ex){
            exception = ex;
        }finally{
            assert.deepEqual(exception instanceof Error && exception.code === 'ECONNREFUSED', true);
        }
    });
});
