'use strict';

const assert = require('assert');
const filesystem = require('fs');
const lala = require('../..');
const { fetchHTTPResponse } = require('../utilities');

describe('Testing view system and templating engine.', () => {
    let server = null, port = null, router = null;

    it('Starting a new HTTP server used to test served views.', async () => {
        server = new lala.HTTPServer();
        port = server.useRandomPort();
        router = new lala.Router();
        await server.addRouter(router).start();
        router.get('/', () => {
            return 'OK';
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port);
        assert.deepEqual(data.body, 'OK');
    });

    it('Rendering a view into an HTML string.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        const factory = new lala.ViewFactory('test/resources/views/view.ejs');
        const view = factory.setStaticParams({
            greeting: 'Hello'
        }).craft({
            name: 'Lala'
        });
        const result = await view.renderAsString();
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Defining a presenter function.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        lala.PresentersRepository.register('addExclamationPoint', (parameters, data) => {
            return data + '!';
        });
        const factory = new lala.ViewFactory('test/resources/views/presenter.ejs');
        const view = factory.setStaticParams({
            greeting: 'Hello'
        }).craft({
            name: 'Lala'
        });
        const result = await view.renderAsString();
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Printing current request CSRF token into a view.', async () => {
        let expectation = null;
        router.get('/csrf-test', (request) => {
            expectation = '<!doctype html><html><head></head><body><pre>' + request.getCSRFToken().token + '</pre></body></html>';
            const factory = new lala.ViewFactory('test/resources/views/csrf.ejs');
            return factory.craft();
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/csrf-test');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Printing current request CSRF token as a HTTP header.', async () => {
        let expectation = null;
        router.get('/csrf-header-test', (request) => {
            expectation = '<!doctype html><html><head><meta name="csrf-token" content="' + request.getCSRFToken().token + '" /></head><body></body></html>';
            const factory = new lala.ViewFactory('test/resources/views/csrf_header.ejs');
            return factory.craft();
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/csrf-header-test');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Creating a view route.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        router.view('/serve-view', 'test/resources/views/plain.ejs');
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/serve-view');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Caching the source file of a view.', (done) => {
        const original = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        const edited = '<!doctype html><html><head></head><body><h1>Hello new Lala!</h1></body></html>';
        lala.View.setUseSourceRepository(true);
        filesystem.writeFileSync('test/resources/views/tmp_src.ejs', original);
        const factory = new lala.ViewFactory('test/resources/views/tmp_src.ejs');
        const view = factory.craft();
        view.renderAsString().then((data) => {
            setImmediate(async () => {
                const fresh = data;
                filesystem.writeFileSync('test/resources/views/tmp_src.ejs', edited);
                const cached = await view.renderAsString();
                lala.SourceRepository.clear();
                const reloaded = await view.renderAsString();
                const result = original === fresh && original === cached && edited === reloaded;
                filesystem.unlinkSync('test/resources/views/tmp_src.ejs');
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Caching the rendered output of a view.', (done) => {
        const original = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        const edited = '<!doctype html><html><head></head><body><h1>Hello new Lala!</h1></body></html>';
        const cache = new lala.Cache();
        filesystem.writeFileSync('test/resources/views/tmp.ejs', original);
        const factory = new lala.ViewFactory('test/resources/views/tmp.ejs');
        lala.View.setUseSourceRepository(false);
        const view = factory.setCache(cache).setCaching(true).craft();
        view.renderAsString().then((data) => {
            setImmediate(async () => {
                const fresh = data;
                filesystem.writeFileSync('test/resources/views/tmp.ejs', edited);
                const cached = await view.renderAsString();
                await lala.View.invalidateGlobalCache(cache);
                const reloaded = await view.renderAsString();
                const result = original === fresh && original === cached && edited === reloaded;
                filesystem.unlinkSync('test/resources/views/tmp.ejs');
                lala.View.setUseSourceRepository(true);
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Printing an internal constant.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Welcome to Lala version ' + lala.VERSION + '</h1></body></html>';
        const factory = new lala.ViewFactory('test/resources/views/constant.ejs');
        const view = factory.craft();
        const result = await view.renderAsString();
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Printing current request URL.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>/view-test</h1></body></html>';
        const server = new lala.HTTPServer();
        const port = server.useRandomPort();
        const router = new lala.Router();
        const factory = new lala.ViewFactory('test/resources/views/request.ejs');
        router.view('/view-test', factory);
        await server.addRouter(router).start();
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/view-test');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Rendering a plain HTML view.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>It works!!</h1></body></html>';
        const factory = new lala.HTMLViewFactory('test/resources/views/plain.html');
        const view = factory.craft();
        const result = await view.renderAsString();
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Registering and rendering a registered view.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        const factory = new lala.ViewFactory('test/resources/views/view.ejs');
        factory.register('test');
        const result = await lala.ViewRepository.get('test').craft({
            greeting: 'Hello',
            name: 'Lala'
        }).renderAsString();
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Stopping the created server.', async () => {
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
