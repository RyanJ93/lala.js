'use strict';

const assert = require('assert');
const lala = require('../../index');
const { fetchHTTPResponse } = require('../utilities');

describe('Testing authenticator behaviour (Basic HTTP auth mechanism).', () => {
    let authenticator = null, server = null, port = null, url = null, router = null;

    it('Setting up the test server.', async () => {
        server = new lala.HTTPServer();
        port = server.useRandomPort();
        await server.start();
        url = 'http://127.0.0.1:' + port + '/';
        router = new lala.Router();
        server.addRouter(router).on('exception', (ex) => {
            if ( ex.constructor.name !== 'InvalidCredentialsHTTPException' ){
                console.log(ex);
            }
        });
    });

    it('Setting up an authenticator.', () => {
        authenticator = new lala.BasicHTTPAuthenticator();
        authenticator.setRealm('A test realm!').setCharset('utf-8');
        authenticator.setCredentialsAsObject({
            sigtest: 'some_password_as_object'
        });
        authenticator.setCredentialsFile('test/resources/credentials.json');
        router.setAuth(true).setAuthenticator(authenticator);
        router.get('/', () => 'OK');
    });

    it('Simulating a request using wrong credentials.', async () => {
        const response = await fetchHTTPResponse(url, {
            auth: {
                user: 'sigtest',
                pass: 'some_wrong_password_as_object'
            }
        });
        assert.deepEqual(response.statusCode, 401);
    });

    it('Simulating a request using valid credentials.', async () => {
        const response = await fetchHTTPResponse(url, {
            auth: {
                user: 'sigtest',
                pass: 'some_password_as_object'
            }
        });
        assert.deepEqual(response.statusCode, 200);
    });

    it('Using credentials defined in an external JSON file.', async () => {
        const response = await fetchHTTPResponse(url, {
            auth: {
                user: 'lala',
                pass: 'a_cute_password'
            }
        });
        assert.deepEqual(response.statusCode, 200);
    });

    it('Using credentials defined in an external JSON file and compare user object defined.', () => {
        return new Promise((resolve, reject) => {
            router.get('/test-credentials-file', (request) => {
                assert.deepEqual(request.user.firstName, 'Lala.js');
                resolve();
            });
            fetchHTTPResponse(url + 'test-credentials-file', {
                auth: {
                    username: '_lala',
                    password: 'a_cute_password'
                }
            });
        });
    });

    it('Looking up a custom user representation object after authentication.', () => {
        return new Promise((resolve, reject) => {
            const user = {
                firstName: 'Sig. Test'
            };
            authenticator.setUserLookupFunction((identifier) => {
                return identifier === 'sigtest' ? user : null;
            });
            router.get('/test-custom-user', (request) => {
                assert.deepEqual(request.user, user);
                resolve();
            });
            fetchHTTPResponse(url + 'test-custom-user', {
                auth: {
                    username: 'sigtest',
                    password: 'some_password_as_object'
                }
            });
        });
    });

    it('Using a callback function as credentials provider.', async () => {
        authenticator.setCredentialsCallback((identifier) => {
            return identifier === 'sigtest' ? new lala.Credentials(identifier, 'some_password') : null;
        });
        const response = await fetchHTTPResponse(url, {
            auth: {
                username: 'sigtest',
                password: 'some_password'
            }
        });
        assert.deepEqual(response.statusCode, 200);
    });

    it('Stopping the test server.', () => {
        server.stop();
    });
});