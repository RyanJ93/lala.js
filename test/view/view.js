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
        const view = new lala.View('test/resources/views/view.ejs');
        const result = await view.setParams({
            greeting: 'Hello'
        }).renderAsString({
            name: 'Lala'
        });
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Defining a presenter function.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        lala.PresentersRepository.register('addExclamationPoint', (parameters, data) => {
            return data + '!';
        });
        const view = new lala.View('test/resources/views/presenter.ejs')
        const result = await view.setParams({
            greeting: 'Hello'
        }).renderAsString({
            name: 'Lala'
        });
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Printing current request CSRF token into a view.', async () => {
        let expectation = null;
        router.get('/csrf-test', (request) => {
            expectation = '<!doctype html><html><head></head><body><pre>' + request.CSRFToken.token + '</pre></body></html>';
            return new lala.View('test/resources/views/csrf.ejs');
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/csrf-test');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Creating a view route.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        router.view('/serve-view', 'test/resources/views/plain.ejs');
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/serve-view');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Caching a rendered view.', (done) => {
        const original = '<!doctype html><html><head></head><body><h1>Hello Lala!</h1></body></html>';
        const edited = '<!doctype html><html><head></head><body><h1>Hello new Lala!</h1></body></html>';
        const cache = new lala.Cache();
        filesystem.writeFileSync('test/resources/views/tmp.ejs', original);
        const view = new lala.View('test/resources/views/tmp.ejs');
        view.setCacheHandler(cache);
        view.renderAsString().then((data) => {
            setImmediate(async () => {
                const fresh = data;
                filesystem.writeFileSync('test/resources/views/tmp.ejs', edited);
                const cached = await view.renderAsString();
                await lala.View.invalidateGlobalCache(cache);
                const reloaded = await view.renderAsString();
                const result = original === fresh && original === cached && edited === reloaded;
                filesystem.unlinkSync('test/resources/views/tmp.ejs');
                assert.deepStrictEqual(result, true);
                done();
            });
        });
    });

    it('Printing an internal constant.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>Welcome to Lala version ' + lala.VERSION + '</h1></body></html>';
        const view = new lala.View('test/resources/views/constant.ejs');
        const result = await view.renderAsString();
        assert.deepStrictEqual(result.trim(), expectation);
    });

    it('Printing current request URL.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>/view-test</h1></body></html>';
        const server = new lala.HTTPServer();
        const port = server.useRandomPort();
        const router = new lala.Router();
        router.view('/view-test', new lala.View('test/resources/views/request.ejs'));
        await server.addRouter(router).start();
        const data = await fetchHTTPResponse('http://127.0.0.1:' + port + '/view-test');
        assert.deepStrictEqual(data.body.trim(), expectation);
    });

    it('Rendering a plain HTML view.', async () => {
        const expectation = '<!doctype html><html><head></head><body><h1>It works!!</h1></body></html>';
        const view = new lala.HTMLView('test/resources/views/plain.html');
        const result = await view.renderAsString();
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
