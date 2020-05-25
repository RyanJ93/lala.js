'use strict';

const assert = require('assert');
const lala = require('../..');
const {
    fetchHTTPResponse,
    attachBasicRoutes
} = require('../utilities');

describe('Testing built-in interceptors.', () => {
    let server = null, router = null;

    it('Creating a test server.', async () => {
        server = new lala.HTTPServer();
        await server.setPort(11224).start();
        router = attachBasicRoutes(server);
    });

    it('It should block this request as 192.168.1.1 is the only allowed IP.', async () => {
        const interceptor = new lala.interceptors.IPFilterInterceptor();
        interceptor.setAllowedIPs(['192.168.1.1']).setAllowedOnly(true);
        server.getInterceptorRunner().dropInterceptors().addInterceptor(interceptor);
        const data = await fetchHTTPResponse('http://127.0.0.1:11224/');
        assert.deepEqual(data.statusCode, 403);
    });

    it('It should block request number 101 as a request limit has been defined to 100.', async () => {
        const interceptor = new lala.interceptors.RateLimitInterceptor();
        interceptor.setLimit(100);
        server.getInterceptorRunner().dropInterceptors().addInterceptor(interceptor);
        const requests = [];
        for ( let i = 0 ; i < 99 ; i++ ){
            const request = fetchHTTPResponse('http://127.0.0.1:11224/');
            requests.push(request);
        }
        await Promise.all(requests);
        // SUCCESS
        const acceptedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/');
        // DENIED
        const deniedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/');
        const result = acceptedRequest.statusCode === 200 && deniedRequest.statusCode === 429;
        assert.deepEqual(result, true);
    });

    it('It should block request number 101 to URL "/test" but should still allows to connect to any other URL.', async () => {
        router.get('/test', () => { return ''; });
        const interceptor = new lala.interceptors.RateLimitInterceptor();
        interceptor.setURLLimit('/test', 100).setLimit(110);
        server.getInterceptorRunner().dropInterceptors().addInterceptor(interceptor);
        const requests = [];
        for ( let i = 0 ; i < 99 ; i++ ){
            const request = fetchHTTPResponse('http://127.0.0.1:11224/test');
            requests.push(request);
        }
        await Promise.all(requests);
        // SUCCESS
        const lastAcceptedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/test');
        // DENIED
        const deniedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/test');
        // SUCCESS
        const acceptedRequest = await fetchHTTPResponse('http://127.0.0.1:11224');
        const result = lastAcceptedRequest.statusCode === 200 && deniedRequest.statusCode === 429 && acceptedRequest.statusCode === 200;
        assert.deepEqual(result, true);
    });

    it('It should block request number 11 after changing the interceptor namespace.', async () => {
        const interceptor = new lala.interceptors.RateLimitInterceptor();
        interceptor.setLimit(10).useRandomNamespace();
        server.getInterceptorRunner().dropInterceptors().addInterceptor(interceptor);
        const requests = [];
        for ( let i = 0 ; i < 9 ; i++ ){
            const request = fetchHTTPResponse('http://127.0.0.1:11224/');
            requests.push(request);
        }
        await Promise.all(requests);
        // SUCCESS
        const acceptedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/');
        // DENIED
        const deniedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/');
        const result = acceptedRequest.statusCode === 200 && deniedRequest.statusCode === 429;
        assert.deepEqual(result, true);
    });

    it('Resetting counters.', async () => {
        const interceptor = new lala.interceptors.RateLimitInterceptor();
        interceptor.setLimit(100).useRandomNamespace();
        server.getInterceptorRunner().dropInterceptors().addInterceptor(interceptor);
        const requests = [];
        for ( let i = 0 ; i < 110 ; i++ ){
            const request = fetchHTTPResponse('http://127.0.0.1:11224/');
            requests.push(request);
        }
        await Promise.all(requests);
        // DENIED
        const deniedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/');
        await interceptor.resetAllCounters();
        // SUCCESS
        const acceptedRequest = await fetchHTTPResponse('http://127.0.0.1:11224/');
        const result = acceptedRequest.statusCode === 200 && deniedRequest.statusCode === 429;
        assert.deepEqual(result, true);
    });

    it('Stopping the generated server.', async () => {
        await server.stop();
        let exception = null;
        try{
            await fetchHTTPResponse('http://127.0.0.1:11224/', {
                timeout: 3000
            });
        }catch(ex){
            exception = ex;
        }finally{
            assert.deepEqual(exception instanceof Error && exception.code === 'ECONNREFUSED', true);
        }
    });
});
