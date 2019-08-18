'use strict';

const querystring = require('querystring');
const filesystem = require('fs');
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
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/');
        await server.stop();
        assert.deepEqual(data.body, 'OK');
    });

    it('Triggering a route returning a primitive value.', async () => {
        router.get('/type-primitive', () => {
            return 8.1111;
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/type-primitive');
        assert.deepEqual(data.body, '8.1111');
    });

    it('Triggering a route returning an object.', async () => {
        router.get('/type-object', () => {
            return {a: 1};
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/type-object');
        assert.deepEqual(data.body, '{"a":1}');
    });

    it('Triggering a route returning a function.', async () => {
        router.get('/type-function', () => {
            return async () => {
                return 'OK';
            }
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/type-function');
        assert.deepEqual(data.body, 'OK');
    });

    it('Triggering a route returning a view.', async () => {
        router.get('/type-view', () => {
            return new lala.View('test/resources/test.ejs');
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/type-view');
        const expected = '<!doctype html><html><header><title>It Works!!</title></header></html>';
        assert.deepEqual(data.body, expected);
    });

    it('Triggering a non existing route.', async () => {
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/not-found');
        assert.deepEqual(data.statusCode, 404);
    });

    it('Sending GET parameters.', async () => {
        const parameters = {
            test: 1,
            arr: [1, 2]
        };
        router.get('/get-params', (request) => {
            return request.query;
        });
        const data = await fetchHTTPResponse('http://127.0.0.1:11223/get-params?' + querystring.stringify(parameters));
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
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:11223/post-params?' + querystring.stringify(GETParameters), POSTParameters);
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
        const data = await fetchHTTPResponsePOST('http://127.0.0.1:11223/file-upload?' + querystring.stringify(GETParameters), null, {
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
            await fetchHTTPResponse('http://127.0.0.1:11223/', {
                timeout: 3000
            });
        }catch(ex){
            exception = ex;
        }finally{
            assert.deepEqual(exception instanceof Error && exception.code === 'ECONNREFUSED', true);
        }
    });
});
