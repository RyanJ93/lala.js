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
            const factory = new lala.ViewFactory('test/resources/test.ejs');
            return factory.craft();
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/type-view');
        const expected = '<!doctype html><html><header><title>It Works!!</title></header></html>';
        assert.deepEqual(data.body, expected);
    });

    it('Triggering a non existing route.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/not-found');
        assert.deepEqual(data.statusCode, 404);
    });

    it('Redirect a request.', async () => {
        router.redirect('/redirect-test', '/redirect-target');
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/redirect-test', {
            followRedirect: false
        });
        const result = response.statusCode === 303 && response.headers.location === '/redirect-target';
        assert.deepEqual(result, true);
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

    it('Sending URL parameters.', async () => {
        router.get('/some/test/:name', (request) => {
            return request.params;
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/some/test/route');
        assert.deepEqual(JSON.parse(data.body), {
            name: 'route'
        });
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

    it('Ignoring uploaded files.', async () => {
        const inputProcessor = server.getInputProcessorFactory();
        inputProcessor.setAllowFileUploads(false);
        const POSTParameters = {
            jpg: filesystem.createReadStream('test/resources/upload-test.jpg')
        };
        router.post('/not-a-file-upload', async (request) => {
            return typeof request.files.jpg !== 'undefined' ? await fileDigest(request.files.jpg.getPath()) : '';
        });
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/not-a-file-upload', null, {
            formData: POSTParameters
        });
        inputProcessor.setAllowFileUploads(true);
        assert.deepEqual(data.body, '');
    });

    it('Sending a POST request having an empty body.', async () => {
        router.post('/empty-body', () => { return ''; });
        const response = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/empty-body');
        assert.deepEqual(response.statusCode, 200);
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
        const storage = new lala.ServerSupport.CSRFTokenStorage();
        server.getAuthorizationProcessorFactory().setCSRFTokenStorage(storage);
        router.get('/with-csrf', () => {}, {
            withCSRF: true
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/with-csrf');
        const header = data.headers.hasOwnProperty('set-cookie') ? data.headers['set-cookie'][0] : '';
        const section = header.match(/[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}/);
        const result = section !== null && section[0] !== '' && storage.has(section[0]);
        assert.deepEqual(result, true);
    });

    it('Testing automatic CSRF token verification.', async () => {
        server.getAuthorizationProcessorFactory().setCSRFFieldName('_token');
        let token = '';
        router.any('/csrf-test', async (request) => {
            token = request.CSRFToken === null ? '' : request.CSRFToken.token;
            return '';
        }, {
            withCSRF: true
        });
        router.post('/csrf-test', async (request) => {
            token = request.CSRFToken === null ? '' : request.CSRFToken.token;
            return '';
        }, {
            withCSRF: true,
            requireCSRF: true
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

    it('Setting a custom cookie name and options for the CSRF cookie.', async () => {
        server.getAuthorizationProcessorFactory().setCSRFIDCookieName('custom_name').setCSRFIDCookieOptions({
            domain: 'test.com'
        });
        let tokenID = '';
        router.get('/custom-csrf-cookie', (request) => {
            tokenID = request.CSRFToken === null ? '' : request.CSRFToken.id;
        }, {
            withCSRF: true
        });
        lala.Logger.setDebug(true);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/custom-csrf-cookie');
        const expected = 'custom_name=' + tokenID + '; Version=1; Domain=.; Path=/; HttpOnly';
        assert.deepEqual(response.headers['set-cookie'][0], expected);
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

    it('Overriding current request HTTP method using a POST parameter.', async () => {
        const processor = server.getRequestProcessorFactory();
        processor.setAllowMethodOverride(true).setMethodOverrideParamName('_override');
        let result = false;
        router.patch('/method-override', () => {
            result = true;
        });
        await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/method-override', {
            _override: 'PATCH'
        });
        processor.setAllowMethodOverride(false).setMethodOverrideParamName('_method');
        assert.deepEqual(result, true);
    });

    it('Overriding current request HTTP method using a header.', async () => {
        const processor = server.getRequestProcessorFactory();
        processor.setAllowMethodOverride(true);
        let result = false;
        router.delete('/method-override-2', () => {
            result = true;
        });
        await fetchHTTPResponse('http://127.0.0.1:' + port + '/method-override-2', {
            headers: {
                'X-HTTP-Method-Override': 'DELETE'
            }
        });
        processor.setAllowMethodOverride(false);
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

    it('Serving a file setting a custom content type and charset.', async () => {
        const route = router.resource('/content-type-test', __dirname + '/../resources/');
        route.addMiddleware('test', async (request, response, next) => {
            response.charset = 'ascii';
            response.contentType = 'application/json';
            await next();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/content-type-test/fake_json.txt');
        assert.deepStrictEqual(response.headers['content-type'], 'application/json; charset="ascii"');
    });

    it('Setting up HTTP caching for text responses.', async () => {
        router.get('/http-cache-test', () => { return 'OK'; });
        const cacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
        cacheManager.setMIMETypeCaching('text/plain', 3600);
        cacheManager.setMIMETypeCaching('text/html', 60);
        server.getOutputProcessorFactory().getHeaderManagers().push(cacheManager);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/http-cache-test');
        server.getOutputProcessorFactory().setHeaderManagers([]);
        assert.deepStrictEqual(response.headers['cache-control'], 'public, max-age=3600');
    });

    it('Settings up HTTP caching at router level.', async () => {
        router.get('/http-cache-router-test', () => { return 'OK'; });
        const cacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
        cacheManager.setMIMETypeCaching('text/plain', 3600);
        router.getHeaderManagers().push(cacheManager);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/http-cache-router-test');
        router.setHeaderManagers([]);
        assert.deepStrictEqual(response.headers['cache-control'], 'public, max-age=3600');
    });

    it('Settings up HTTP caching for a single route.', async () => {
        const route = router.get('/http-cache-route-test', () => { return 'OK'; });
        const cacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
        cacheManager.setMIMETypeCaching('text/plain', 3600);
        route.getHeaderManagers().push(cacheManager);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/http-cache-route-test');
        assert.deepStrictEqual(response.headers['cache-control'], 'public, max-age=3600');
    });

    it('Setting up HTTP caching for a file extension.', async () => {
        const route = router.resource('/http-cache-extension-test', __dirname + '/../resources/');
        const cacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
        cacheManager.setExtensionCaching('txt', 3600, false);
        route.getHeaderManagers().push(cacheManager);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/http-cache-extension-test/test.txt');
        assert.deepStrictEqual(response.headers['cache-control'], 'private, max-age=3600');
    });

    it('Disable caching for a route.', async () => {
        const route = router.get('/http-cache-no-cache-test', () => { return 'OK'; });
        const globalCacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
        globalCacheManager.setMIMETypeCaching('text/plain', 3600);
        server.getOutputProcessorFactory().getHeaderManagers().push(globalCacheManager);
        const cacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
        cacheManager.setMIMETypeCaching('text/plain', 0);
        route.getHeaderManagers().push(cacheManager);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/http-cache-no-cache-test');
        server.getOutputProcessorFactory().setHeaderManagers([]);
        const result = response.headers['cache-control'] === 'no-store, no-cache, must-revalidate, max-age=0' && response.headers['pragma'] === 'no-cache';
        assert.deepStrictEqual(result, true);
    });

    it('Settings up CSP.', async () => {
        router.get('/csp-test', () => { return 'OK'; });
        const cspHeaderManager = new lala.HTTPHeaderManagers.CSPHeaderManager();
        cspHeaderManager.setDirective(lala.HTTPHeaderManagers.CSPHeaderManager.DEFAULT_SRC, ["self"]);
        server.getOutputProcessorFactory().getHeaderManagers().push(cspHeaderManager);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/csp-test');
        server.getOutputProcessorFactory().setHeaderManagers([]);
        assert.deepStrictEqual(response.headers['content-security-policy'], 'default-src \'self\'');
    });

    it('Enable CORS for a single route.', async () => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe');
        const route = router.get('/cors-test', () => { return 'OK'; });
        route.setCORSOptions(corsOptions);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/cors-test');
        assert.deepStrictEqual(response.headers['access-control-allow-origin'], 'http://lalajs.moe');
    });

    it('Use dynamic origin with CORS.', async () => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOriginCallback(() => {
            return 'http://dynamic.lalajs.moe';
        });
        const route = router.get('/dynamic-cors-test', () => { return 'OK'; });
        route.setCORSOptions(corsOptions);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/dynamic-cors-test');
        assert.deepStrictEqual(response.headers['access-control-allow-origin'], 'http://dynamic.lalajs.moe');
    });

    it('Send a request that breaks CORS policy.', async () => {
        let exception = null;
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe').setStrict(true);
        const route = router.get('/some-cors', () => { return 'OK'; });
        route.setCORSOptions(corsOptions);
        server.getExceptionProcessorFactory().setDefaultExceptionHandler((ex) => {
            exception = ex;
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/some-cors', {
            headers: {
                Origin: 'http://subdomain.lalajs.moe'
            }
        });
        server.getExceptionProcessorFactory().setDefaultExceptionHandler(null);
        const result = response.statusCode === 403 && exception instanceof lala.UnallowedCORSOriginHTTPException;
        assert.deepStrictEqual(result, true);
    });

    it('Simulating a preflight OPTIONS request.', (done) => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe').setAllowMethods(['GET', 'OPTIONS']).setAllowHeaders(['X-PINGOTHER']);
        const route = router.get('/options-test', () => { return 'OK'; });
        route.setCORSOptions(corsOptions);
        request.options('http://127.0.0.1:' + port + '/options-test', {
            headers: {
                ['Access-Control-Request-Method']: 'GET',
                ['Access-Control-Request-Headers']: 'X-PINGOTHER',
                Origin: 'http://lalajs.moe'
            }
        }, (error, response) => {
            assert.deepStrictEqual(response.headers['access-control-allow-origin'], 'http://lalajs.moe');
            done();
        });
    });

    it('Simulating an invalid preflight OPTIONS request.', (done) => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe').setAllowMethods(['GET', 'OPTIONS']).setAllowHeaders(['X-PINGOTHER']);
        const route = router.get('/invalid-options-test', () => { return 'OK'; });
        route.setCORSOptions(corsOptions);
        request.options('http://127.0.0.1:' + port + '/invalid-options-test', {
            headers: {
                ['Access-Control-Request-Method']: 'GET',
                ['Access-Control-Request-Headers']: 'x-invalid-header',
                Origin: 'http://lalajs.moe'
            }
        }, (error, response) => {
            assert.deepStrictEqual(response.headers['access-control-allow-origin'], undefined);
            done();
        });
    });

    it('Setting up CORS for a router.', async () => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe');
        router.setCORSOptions(corsOptions);
        router.get('/another-cors-test', () => { return 'OK'; });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/another-cors-test');
        router.setCORSOptions(null);
        assert.deepStrictEqual(response.headers['access-control-allow-origin'], 'http://lalajs.moe');
    });

    it('Setting up CORS for the whole server.', async () => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe');
        server.getRouteProcessorFactory().setCORSOptions(corsOptions);
        router.get('/server-cors-test', () => { return 'OK'; });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/server-cors-test');
        server.getRouteProcessorFactory().setCORSOptions(null);
        assert.deepStrictEqual(response.headers['access-control-allow-origin'], 'http://lalajs.moe');
    });

    it('Overriding CORS settings defined on the server for a single route.', async () => {
        const corsOptions = new lala.ServerSupport.CORSOptions();
        corsOptions.setAllowOrigin('http://lalajs.moe');
        server.getRouteProcessorFactory().setCORSOptions(corsOptions);
        const route = router.get('/override-cors-test', () => { return 'OK'; });
        const otherCorsOptions = new lala.ServerSupport.CORSOptions();
        otherCorsOptions.setAllowOrigin('http://other.lalajs.moe');
        route.setCORSOptions(otherCorsOptions);
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/override-cors-test');
        server.getRouteProcessorFactory().setCORSOptions(null);
        assert.deepStrictEqual(response.headers['access-control-allow-origin'], 'http://other.lalajs.moe');
    });

    it('Request a cacheable resource twice.', (done) => {
        router.resource('/conditionals-test', __dirname + '/../resources/');
        let eTag = null, lastModified = null;
        request.get('http://127.0.0.1:' + port + '/conditionals-test/test.txt', (error, response) => {
            let freshResponseStatusCode = response.statusCode;
            eTag = response.headers['etag'];
            lastModified = response.headers['last-modified'];
            request.get('http://127.0.0.1:' + port + '/conditionals-test/test.txt', {
                headers: {
                    ['If-None-Match']: eTag,
                    ['If-Modified-Since']: lastModified
                }
            }, (error, response) => {
                const result = freshResponseStatusCode === 200 && response.statusCode === 304;
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Manually checking resource changes before sending.', (done) => {
        router.get('/conditionals-manual-test', (request, response) => {
            response.setHeader('etag', 'some-etag');
            if ( request.matchConditionals('some-etag', null) ){
                response.unchanged();
            }
        });
        request.get('http://127.0.0.1:' + port + '/conditionals-manual-test', {
            headers: {
                ['If-None-Match']: 'some-etag'
            }
        }, (error, response) => {
            assert.deepStrictEqual(response.statusCode, 304);
            done();
        });
    });

    it('Prevent conditionals header to be interpreted for a single resource.', (done) => {
        router.resource('/conditionals-middleware-test', __dirname + '/../resources/');
        router.addMiddleware('conditionals-middleware-test', async (request, response, next) => {
            if ( request.path === '/conditionals-middleware-test/test.txt' ){
                request.ignoreConditionalsHeaders();
            }
            await next();
        });
        let eTag = null, lastModified = null;
        request.get('http://127.0.0.1:' + port + '/conditionals-middleware-test/test.txt', (error, response) => {
            let freshResponseStatusCode = response.statusCode;
            eTag = response.headers['etag'];
            lastModified = response.headers['last-modified'];
            request.get('http://127.0.0.1:' + port + '/conditionals-middleware-test/test.txt', {
                headers: {
                    ['If-None-Match']: eTag,
                    ['If-Modified-Since']: lastModified
                }
            }, (error, response) => {
                router.removeMiddleware('conditionals-middleware-test');
                const result = freshResponseStatusCode === 200 && response.statusCode === 200;
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Disable conditionals header support for a whole route.', (done) => {
        router.resource('/conditionals-disabled-test', __dirname + '/../resources/', {
            allowConditionalRequests: false
        });
        let eTag = null, lastModified = null;
        request.get('http://127.0.0.1:' + port + '/conditionals-disabled-test/test.txt', (error, response) => {
            let freshResponseStatusCode = response.statusCode;
            eTag = response.headers['etag'];
            lastModified = response.headers['last-modified'];
            request.get('http://127.0.0.1:' + port + '/conditionals-disabled-test/test.txt', {
                headers: {
                    ['If-None-Match']: eTag,
                    ['If-Modified-Since']: lastModified
                }
            }, (error, response) => {
                const result = freshResponseStatusCode === 200 && response.statusCode === 200;
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Check if a MIME type is accepted according to the client provided Accept header.', (done) => {
        router.get('/accepted-mime-test', (request) => {
            if ( !request.isMIMETypeAccepted('text/html') ){
                request.notAcceptable();
            }
            return '1';
        });
        router.get('/not-accepted-mime-test', (request) => {
            if ( !request.isMIMETypeAccepted('application/json') ){
                request.notAcceptable();
            }
            return '1';
        });
        request.get('http://127.0.0.1:' + port + '/accepted-mime-test', {
            headers: {
                ['Accept']: 'text/html, application/xhtml+xml, application/xml;q=0.9'
            }
        }, (error, acceptedResponse) => {
            request.get('http://127.0.0.1:' + port + '/not-accepted-mime-test', {
                headers: {
                    ['Accept']: 'text/html, application/xhtml+xml, application/xml;q=0.9'
                }
            }, (error, notAcceptedResponse) => {
                const result = acceptedResponse.statusCode === 200 && acceptedResponse.body === '1' && notAcceptedResponse.statusCode === 406;
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Get MIMEType score according to the client provided Accept header.', (done) => {
        router.get('/accepted-mime-score-test', (request) => {
            return request.getMIMETypeAcceptScore('text/html');
        });
        router.get('/not-accepted-mime-score-test', (request) => {
            return request.getMIMETypeAcceptScore('application/json');
        });
        request.get('http://127.0.0.1:' + port + '/accepted-mime-score-test', {
            headers: {
                ['Accept']: 'text/html, application/xhtml+xml, application/xml;q=0.9'
            }
        }, (error, acceptedResponse) => {
            request.get('http://127.0.0.1:' + port + '/not-accepted-mime-score-test', {
                headers: {
                    ['Accept']: 'text/html, application/xhtml+xml, application/xml;q=0.9'
                }
            }, (error, notAcceptedResponse) => {
                const result = acceptedResponse.body === '1' && notAcceptedResponse.body === '0';
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Decide which MIMEType is accepted according to the client provided Accept header.', (done) => {
        router.get('/which-mime', (request) => {
            return request.whichAcceptedMIMEType(['text/html', 'application/json']);
        });
        request.get('http://127.0.0.1:' + port + '/which-mime', {
            headers: {
                ['Accept']: 'text/html, application/xhtml+xml, application/xml;q=0.9'
            }
        }, (error, response) => {
            assert.deepStrictEqual(response.body, 'text/html');
            done();
        });
    });

    it('Returns 406 error using a helper function.', async () => {
        router.get('/helper-406', (request) => {
            request.notAcceptable();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-406');
        assert.deepStrictEqual(response.statusCode, 406);
    });

    it('Returns 404 error using a helper function.', async () => {
        router.get('/helper-404', (request) => {
            request.notFound();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-404');
        assert.deepStrictEqual(response.statusCode, 404);
    });

    it('Returns 403 error using a helper function.', async () => {
        router.get('/helper-403', (request) => {
            request.forbidden();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-403');
        assert.deepStrictEqual(response.statusCode, 403);
    });

    it('Returns 403 error using a helper function.', async () => {
        router.get('/helper-403', (request) => {
            request.forbidden();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-403');
        assert.deepStrictEqual(response.statusCode, 403);
    });

    it('Returns 403 error using a helper function.', async () => {
        router.get('/helper-403', (request) => {
            request.forbidden();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-403');
        assert.deepStrictEqual(response.statusCode, 403);
    });

    it('Returns 400 error using a helper function.', async () => {
        router.get('/helper-400', (request) => {
            request.badRequest();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-400');
        assert.deepStrictEqual(response.statusCode, 400);
    });

    it('Returns 401 error using a helper function.', async () => {
        router.get('/helper-401', (request) => {
            request.unauthorized();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-401');
        assert.deepStrictEqual(response.statusCode, 401);
    });

    it('Asking to the client to drop cached data and cookies.', async () => {
        router.get('/clear-cache-and-cookies-test', (request, response) => {
            response.clearSiteData(true, true);
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/clear-cache-and-cookies-test');
        assert.deepStrictEqual(response.headers['clear-site-data'], '"cache", "cookies"');
    });

    it('Asking to the client to wipe out all his data related to the website.', async () => {
        router.get('/clear-all-client-data-test', (request, response) => {
            response.clearAllSiteData();
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/clear-all-client-data-test');
        assert.deepStrictEqual(response.headers['clear-site-data'], '"cache", "cookies", "storage", "executionContexts"');
    });

    it('Triggering a redirect using a built-in helper function.', async () => {
        router.get('/helper-redirect-test', (request, response) => {
            return response.redirect('/test');
        });
        const response = await fetchHTTPResponse('http://127.0.0.1:' + port + '/helper-redirect-test', {
            followRedirect: false
        });
        assert.deepStrictEqual(response.headers.location, '/test');
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
