'use strict';

const assert = require('assert');
const lala = require('../..');
const {
    fetchHTTPResponse,
    attachBasicRoutes
} = require('../utilities');

describe('Testing authentication system.', () => {
    let authenticator = null, credentialProvider = null, server = null;

    it('Defining an authenticator (using a callback based credential provider).', () => {
        authenticator = new lala.BasicHTTPAuthenticator();
        credentialProvider = new lala.CredentialsProviders.CallbackBasedCredentialsProvider((identifier) => {
            return identifier === 'sigtest' ? 'password' : null;
        });
        authenticator.setCredentialsProvider(credentialProvider);
    });

    it('Creating a server and add the created authenticator.', async () => {
        server = new lala.HTTPServer();
        server.setPort(11225);
        const router = attachBasicRoutes(server);
        router.setAuthenticator(authenticator);
        await server.start();
    });

    it('Sending a request to the created server using valid credentials.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:11225/', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        assert.deepEqual(data.statusCode, 200);
    });

    it('Sending a request to the created server using invalid credentials.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:11225/', {
            auth: {
                user: 'sigtest',
                pass: 'invalid-password'
            }
        });
        assert.deepEqual(data.statusCode, 401);
    });

    it('Switching to a repository based credentials provider.', () => {
        credentialProvider = new lala.CredentialsProviders.RepositoryBasedCredentialsProvider();
        credentialProvider.addCredentials('new-username', 'new-password');
        authenticator.setCredentialsProvider(credentialProvider);
    });

    it('Sending a request using new credentials.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:11225/', {
            auth: {
                user: 'new-username',
                pass: 'new-password'
            }
        });
        assert.deepEqual(data.statusCode, 200);
    });

    it('Stopping the generated server.', async () => {
        await server.stop();
        let exception = null;
        try{
            await fetchHTTPResponse('http://127.0.0.1:11225/', {
                timeout: 3000
            });
        }catch(ex){
            exception = ex;
        }finally{
            assert.deepEqual(exception instanceof Error && exception.code === 'ECONNREFUSED', true);
        }
    });
});
