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
        const GETParameters = {
            test: 1,
            arr: [1, 2]
        };
        const POSTParameters = {
            v: 'ttt',
            //arr: [7, 9, 'iii'], // Array not working, still trying to figure out if it is an app, module or querystring's issue.
            f: 8,
            em: '😃',
            file: filesystem.createReadStream('test/resources/upload-test.jpg')
        };
        router.post('/file-upload', async (request) => {
            request.params.file = typeof request.files.file !== 'undefined' ? await fileDigest(request.files.file.getPath()) : null;
            return Object.assign(request.query, request.params);
        });
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/file-upload?' + querystring.stringify(GETParameters), null, {
            formData: POSTParameters
        });
        POSTParameters.file = await fileDigest('test/resources/upload-test.jpg');
        assert.deepEqual(JSON.parse(data.body), Object.assign(GETParameters, POSTParameters));
    });

    it('Excluding a file extension then uploading some files.', async () => {
        const inputProcessor = server.getInputProcessorFactory();
        inputProcessor.addDeniedFileExtension('jpg');
        const POSTParameters = {
            jpg: filesystem.createReadStream('test/resources/upload-test.jpg'),
            png: filesystem.createReadStream('test/resources/nyan-cat.png')
        };
        router.post('/denied-file-extensions', async (request) => {
            request.params.jpg = typeof request.files.jpg !== 'undefined' ? await fileDigest(request.files.jpg.getPath()) : null;
            request.params.png = typeof request.files.png !== 'undefined' ? await fileDigest(request.files.png.getPath()) : null;
            return request.params;
        });
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/denied-file-extensions', null, {
            formData: POSTParameters
        });
        POSTParameters.jpg = null;
        POSTParameters.png = await fileDigest('test/resources/nyan-cat.png');
        inputProcessor.dropDeniedExtensions();
        assert.deepEqual(JSON.parse(data.body), POSTParameters);
    });

    it('Setting a file size limit and then uploading some files.', async () => {
        let exception = null;
        const inputProcessor = server.getInputProcessorFactory();
        const exceptionProcessor = server.getExceptionProcessorFactory();
        inputProcessor.setMaxUploadedFileSize(524288);
        const POSTParameters = {
            jpg: filesystem.createReadStream('test/resources/upload-test.jpg')
        };
        router.post('/file-upload', async (request) => {
            request.params.jpg = typeof request.files.jpg !== 'undefined' ? await fileDigest(request.files.jpg.getPath()) : null;
            return request.params;
        });
        exceptionProcessor.setDefaultExceptionHandler((ex) => {
            exception = ex.constructor.name;
        });
        await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/file-upload', null, {
            formData: POSTParameters
        });
        inputProcessor.setMaxUploadedFileSize(null);
        exceptionProcessor.setDefaultExceptionHandler(null);
        assert.deepEqual(exception, 'RequestEntityTooLargeHTTPException');
    });

    it('Setting a file count limit and then uploading some files.', async () => {
        let exception = null;
        const inputProcessor = server.getInputProcessorFactory();
        const exceptionProcessor = server.getExceptionProcessorFactory();
        inputProcessor.setMaxAllowedFileNumber(1);
        const POSTParameters = {
            jpg: filesystem.createReadStream('test/resources/upload-test.jpg'),
            png: filesystem.createReadStream('test/resources/nyan-cat.png')
        };
        router.post('/file-upload', async (request) => {
            request.params.jpg = typeof request.files.jpg !== 'undefined' ? await fileDigest(request.files.jpg.getPath()) : null;
            request.params.png = typeof request.files.png !== 'undefined' ? await fileDigest(request.files.png.getPath()) : null;
            return request.params;
        });
        exceptionProcessor.setDefaultExceptionHandler((ex) => {
            exception = ex.constructor.name;
        });
        await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/file-upload', null, {
            formData: POSTParameters
        });
        inputProcessor.setMaxAllowedFileNumber(null);
        exceptionProcessor.setDefaultExceptionHandler(null);
        assert.deepEqual(exception, 'RequestEntityTooLargeHTTPException');
    });

    it('Hiding identification headers from the client response.', async () => {
        server.getOutputProcessorFactory().setStealth(true);
        const stealthRequest = await fetchHTTPResponse('http://127.0.0.1:' + port + '/');
        server.getOutputProcessorFactory().setStealth(false);
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/');
        const result = !stealthRequest.headers.hasOwnProperty('x-powered-by') && data.headers.hasOwnProperty('x-powered-by');
        assert.deepEqual(result, true);
    });

    it('Extract segments from request URL.', (done) => {
        router.get('/segment/test', (request) => {
            const result = request.segments[0] === 'segment' && request.segments[1] === 'test';
            assert.deepEqual(result, true);
            done();
        });
        fetchHTTPResponse('http://127.0.0.1:' + port + '/segment/test');
    });

    it('Listing all the files in a directory.', async () => {
        const location = __dirname + '/../resources/';
        const route = router.resource('/assets', location);
        const invalidRequest = await fetchHTTPResponse('http://127.0.0.1:' + port + '/assets/listing');
        route.setDirectoryListing(true);
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/assets/listing');
        const result = invalidRequest.statusCode === 403 && data.body.indexOf('1.txt') > 0 && data.body.indexOf('3.txt') > 0 && data.body.indexOf('5.txt') > 0;
        assert.deepEqual(result, true);
    });

    it('Checking if a CSRF token has been generated for current request.', async () => {
        // TODO: replace this.
        const CSRFStorage = require('../../lib/Server/support/CSRFTokenStorage');
        const storage = new CSRFStorage();
        server.getAuthorizationProcessorFactory().setCSRFTokenStorage(storage);
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/');
        const header = data.headers.hasOwnProperty('set-cookie') ? data.headers['set-cookie'][0] : '';
        const section = header.match(/[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}/);
        const result = section !== null && section[0] !== '' && storage.has(section[0]);
        assert.deepEqual(result, true);
    });

    it('Testing automatic CSRF token verification.', async () => {
        server.getAuthorizationProcessorFactory().setCSRFFieldName('_token');
        let token = '';
        router.get('/csrf-test', async (request) => {
            if ( request.CSRFToken !== null ){
                token = request.CSRFToken.token;
            }
        });
        await fetchHTTPResponse('http://127.0.0.1:' + port + '/csrf-test', {
            jar: true
        });
        const validRequest = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/csrf-test', {
            _token: token
        }, {
            jar: true
        });
        const invalidRequest = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/csrf-test', {
            _token: 'some invalid token'
        }, {
            jar: true
        });
        const result = validRequest.statusCode === 200 && invalidRequest.statusCode === 403;
        assert.deepEqual(result, true);
    });

    it('Encrypting and then decrypting cookies.', async () => {
        router.get('/cookie-set-clear', async (request, response) => {
            response.setCookie('test_clear', '1');
        });
        router.get('/cookie-set-encrypted', async (request, response) => {
            response.setCookie('test_encrypted', '2');
        });
        router.get('/cookie-get', async (request) => {
            return request.getCookie('test_clear').getValue() + ':' + request.getCookie('test_encrypted').getValue();
        });
        await fetchHTTPResponse('http://127.0.0.1:' + port + '/cookie-set-clear', {
            jar: true
        });
        const cookieProcessor = server.getHTTPCookieProcessorFactory();
        cookieProcessor.setEncryption(true).setEncryptionKey('test');
        await fetchHTTPResponse('http://127.0.0.1:' + port + '/cookie-set-encrypted', {
            jar: true
        });
        const expected = '1:2';
        const valueWithDecryption = await fetchHTTPResponse('http://127.0.0.1:' + port + '/cookie-get', {
            jar: true
        });
        cookieProcessor.setEncryption(false);
        const valueWithoutDecryption = await fetchHTTPResponse('http://127.0.0.1:' + port + '/cookie-get', {
            jar: true
        });
        const result = valueWithDecryption.body === expected && valueWithoutDecryption.body !== expected && valueWithoutDecryption.body.substr(0, 2) === '1:';
        assert.deepEqual(result, true);
    });

    it('Checking event chaining.', async () => {
        let count = 0;
        router.get('/event', () => {});
        const connection = fetchHTTPResponse('http://127.0.0.1:' + port + '/event');
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
