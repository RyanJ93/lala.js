'use strict';

const querystring = require('querystring');
const filesystem = require('fs');
const request = require('request');
const assert = require('assert');
const lala = require('../..');
const {
    fetchHTTPResponse,
    fetchHTTPResponsePOST,
    attachBasicRoutes,
    fileDigest
} = require('../utilities');

describe('Testing HTTP server capabilities.', () => {
    let server = null, port = null, router = null;

    it('Starting a new HTTP server.', async () => {
        server = new lala.HTTPServer();
        server.setPort(11223);
        router = attachBasicRoutes(server);
        await server.start();
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/');
        assert.deepEqual(data.body, 'OK');
    });

    it('Switch server to a random port.', async () => {
        port = server.useRandomPort();
        await server.start(true);
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/');
        assert.deepEqual(data.body, 'OK');
    });

    it('Triggering a route returning a primitive value.', async () => {
        router.get('/type-primitive', () => {
            return 8.1111;
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/type-primitive');
        assert.deepEqual(data.body, '8.1111');
    });

    it('Triggering a route returning an object.', async () => {
        router.get('/type-object', () => {
            return {a: 1};
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/type-object');
        assert.deepEqual(data.body, '{"a":1}');
    });

    it('Triggering a route returning a function.', async () => {
        router.get('/type-function', () => {
            return async () => {
                return 'OK';
            }
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/type-function');
        assert.deepEqual(data.body, 'OK');
    });

    it('Triggering a route returning a view.', async () => {
        router.get('/type-view', () => {
            return new lala.View('test/resources/test.ejs');
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/type-view');
        const expected = '<!doctype html><html><header><title>It Works!!</title></header></html>';
        assert.deepEqual(data.body, expected);
    });

    it('Triggering a non existing route.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/not-found');
        assert.deepEqual(data.statusCode, 404);
    });

    it('Define and check an URL mapping.', async () => {
        router.get('/mapping', (request, response) => {
            return request.mapping.language;
        });
        server.getRequestProcessorFactory().setURLMapping('(?<language>[a-z]+).lalajs.local');
        const data = await fetchHTTPResponse('http://it.lalajs.local:' + port + '/mapping');
        server.getRequestProcessorFactory().setURLMapping(null);
        assert.deepEqual(data.body, 'it');
    });

    it('Declare a language for a specific domain (using TLD).', async () => {
        router.get('/language-declaration', (request, response) => {
            return request.declaredLanguage;
        });
        server.getRequestProcessorFactory().addLanguageDeclaration('lalajs.it', 'it', lala.processors.factories.RequestProcessorFactory.TLD_LANGUAGE_DECLARATION);
        const data = await fetchHTTPResponse('http://lalajs.it:' + port + '/language-declaration');
        server.getRequestProcessorFactory().dropLanguageDeclarations();
        assert.deepEqual(data.body, 'it');
    });

    it('Declare a language for a specific domain (using sub domain).', async () => {
        server.getRequestProcessorFactory().addLanguageDeclaration('en.lalajs.local', 'en', lala.processors.factories.RequestProcessorFactory.SUB_DOMAIN_LANGUAGE_DECLARATION);
        const data = await fetchHTTPResponse('http://en.lalajs.local:' + port + '/language-declaration');
        server.getRequestProcessorFactory().dropLanguageDeclarations();
        assert.deepEqual(data.body, 'en');
    });

    it('Declare a language for a specific domain (using path prefix).', async () => {
        server.getRequestProcessorFactory().addLanguageDeclaration('fr', 'fr', lala.processors.factories.RequestProcessorFactory.PATH_PREFIX_LANGUAGE_DECLARATION);
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/fr/language-declaration');
        server.getRequestProcessorFactory().dropLanguageDeclarations();
        assert.deepEqual(data.body, 'fr');
    });

    it('Declare a language for a specific domain (using cookie).', async () => {
        const cookie = request.cookie('lang=ru');
        server.getHTTPCookieProcessorFactory().setLanguageCookieName('lang');
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/language-declaration', {
            headers: {
                Cookie: cookie
            }
        });
        assert.deepEqual(data.body, 'ru');
    });

    it('Picking the right route according to client language.', async () => {
        router.get('/lang', (request, response) => {
            return 'it';
        }, {
            language: 'it'
        });
        router.get('/lang', (request, response) => {
            return 'en';
        }, {
            language: 'en'
        });
        router.get('/lang', (request, response) => {
            return '';
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/lang', {
            headers: {
                ['Accept-Language']: 'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5'
            }
        });
        assert.deepEqual(data.body, 'en');
    });

    it('Picking the right route according to declared language.', async () => {
        server.getRequestProcessorFactory().addLanguageDeclaration('it', 'it', lala.processors.factories.RequestProcessorFactory.PATH_PREFIX_LANGUAGE_DECLARATION);
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/it/lang', {
            headers: {
                ['Accept-Language']: 'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5'
            }
        });
        server.getRequestProcessorFactory().dropLanguageDeclarations();
        assert.deepEqual(data.body, 'it');
    });

    it('Picking the non-localized route as none of the client language were found.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/lang', {
            headers: {
                ['Accept-Language']: 'fr-CH, fr;q=0.9, de;q=0.7, *;q=0.5'
            }
        });
        assert.deepEqual(data.body, '');
    });

    it('Checking route resolution priority.', async () => {
        router.get('/test/priority/:param', () => {
            return 1;
        });
        router.get('/test/priority/conflict', () => {
            return 2;
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/test/priority/conflict');
        assert.deepEqual(data.body, '1');
    });

    it('Testing user permissions.', async () => {
        const authenticator = new lala.BasicHTTPAuthenticator();
        authenticator.setCredentialsAsObject({
            sigtest: {
                password: 'password',
                userData: {},
                permissions: ['d.f', 'a.*', 'r.*']
            }
        });
        router.setAuth(true).setAuthenticator(authenticator);
        router.get('/permissions-allowed', () => 'OK', {
            permissions: ['a.b.c', 'd.f']
        });
        const responseAllowed = await fetchHTTPResponse('http://127.0.0.1:' + port + '/permissions-allowed', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.get('/permissions-denied', () => 'Not OK', {
            permissions: ['a.b', 'c.d']
        });
        const responseDenied = await fetchHTTPResponse('http://127.0.0.1:' + port + '/permissions-denied', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.addPermission('r.g').get('/permissions-allowed-by-router', () => 'OK', {
            permissions: ['a.b.c', 'd.f', 'a.d']
        });
        const responseAllowedByRouter = await fetchHTTPResponse('http://127.0.0.1:' + port + '/permissions-allowed-by-router', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.addPermission('q.g').get('/permissions-denied-by-router', () => 'Not OK', {
            permissions: ['a.b.c', 'd.f', 'a.c']
        });
        const responseDeniedByRouter = await fetchHTTPResponse('http://127.0.0.1:' + port + '/permissions-denied-by-router', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.dropPermissions().setAuth(false);
        const result = responseAllowed.body === 'OK' && responseAllowedByRouter.body === 'OK' && responseDenied.statusCode === 403 && responseDeniedByRouter.statusCode === 403;
        assert.deepEqual(result, true);
    });

    it('Testing user policies.', async () => {
        class TestPolicy extends lala.Policy {
            constructor(code){
                super();
                this.code = code;
            }

            async authorize(user, request, response){
                return ( this.code % 2 ) === 1;
            }
        }

        const authenticator = new lala.BasicHTTPAuthenticator();
        authenticator.setCredentialsAsObject({
            sigtest: {
                password: 'password',
                userData: {}
            }
        });
        router.setAuth(true).setAuthenticator(authenticator);
        router.get('/allowed', () => 'OK', {
            policies: {
                test: new TestPolicy(1)
            }
        });
        const responseAllowed = await fetchHTTPResponse('http://127.0.0.1:' + port + '/allowed', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.get('/denied', () => 'Not OK', {
            policies: {
                test: new TestPolicy(2)
            }
        });
        const responseDenied = await fetchHTTPResponse('http://127.0.0.1:' + port + '/denied', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.addPolicy('test', new TestPolicy(1)).get('/router-allowed', () => 'OK', {
            policies: {
                test: new TestPolicy(1)
            }
        });
        const responseAllowedByRouter = await fetchHTTPResponse('http://127.0.0.1:' + port + '/router-allowed', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.addPolicy('test', new TestPolicy(2)).get('/router-denied', () => 'Not OK', {
            policies: {
                test: new TestPolicy(1)
            }
        });
        const responseDeniedByRouter = await fetchHTTPResponse('http://127.0.0.1:' + port + '/router-denied', {
            auth: {
                user: 'sigtest',
                pass: 'password'
            }
        });
        router.dropPolicies().setAuth(false);
        const result = responseAllowed.body === 'OK' && responseAllowedByRouter.body === 'OK' && responseDenied.statusCode === 403 && responseDeniedByRouter.statusCode === 403;
        assert.deepEqual(result, true);
    });

    it('Sending GET parameters.', async () => {
        const parameters = {
            test: 1,
            arr: [1, 2]
        };
        router.get('/get-params', (request) => {
            return request.query;
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/get-params?' + querystring.stringify(parameters));
        assert.deepEqual(JSON.parse(data.body), parameters);
    });

    it('Sending POST parameters.', async () => {
        const GETParameters = {
            test: 1,
            arr: [1, 2]
        };
        const POSTParameters = {
            v: 'ttt',
            //arr: [7, 9, 'iii'], // Array not working, still trying to figure out if it is an app, module or querystring's issue.
            f: 8,
            em: '😃'
        };
        router.post('/post-params', (request) => {
            return Object.assign(request.query, request.params);
        });
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/post-params?' + querystring.stringify(GETParameters), POSTParameters);
        const composite = Object.assign(GETParameters, POSTParameters);
        assert.deepEqual(JSON.parse(data.body), composite);
    });

    it('Uploading files.', async () => {
        // TODO: Currently disabled.
        /*
        const GETParameters = {
            test: 1,
            arr: [1, 2]
        };
        const POSTParameters = {
            v: 'ttt',
            //arr: [7, 9, 'iii'], // Array not working, still trying to figure out if it is an app, module or querystring's issue.
            f: 8,
            em: '😃',
            file: filesystem.createReadStream('test/resources/test.txt')
        };
        router.post('/file-upload', async (request) => {
            const path = typeof request.files === 'object' && request.files !== null && request.files.hasOwnProperty('file') ? request.files.file.getPath() : null;
            const digest = path === null ? null : await fileDigest('test/resources/test.txt');
            request.params.file = digest;
            return Object.assign(request.query, request.params);
        });
        const digest = await fileDigest('test/resources/upload-test.jpg');console.log(digest);
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/file-upload?' + querystring.stringify(GETParameters), null, {
            formData: POSTParameters
        });
        POSTParameters.file = digest;
        const composite = Object.assign(GETParameters, POSTParameters);console.log(JSON.parse(data.body), composite);
        assert.deepEqual(JSON.parse(data.body), composite);
        */
    });

    it('Stopping the server.', async () => {
        await server.stop();
        let exception = null;
        try{
            await fetchHTTPResponse('http://127.0.0.1:' + port + '/', {
                timeout: 3000
            });
        }catch(ex){
            exception = ex;
        }finally{
            assert.deepEqual(exception instanceof Error && exception.code === 'ECONNREFUSED', true);
        }
    });
});
