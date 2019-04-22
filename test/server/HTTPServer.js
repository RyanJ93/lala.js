'use strict';

const assert = require('assert');
const lala = require('../..');
const utilities = require('../utilities');

describe('Testing HTTP server capabilities.', () => {
    let server = null;
    let port = null;

    it('Starting a new HTTP server.', async () => {
        server = new lala.HTTPServer();
        server.setPort(11223);
        await server.start();
        const data = await utilities.ping(11223);console.log(data);
    });

    it('Switch server to a random port.', async () => {
        port = server.useRandomPort();
        await server.start(true);
        const data = await utilities.ping(port);
    });

    it('Executing middlewares.', async () => {
        async function m1(request, handler, next){
            request.someTestProperty = 1;
            await next();
        }
        async function m2(request, handler, next){
            request.someTestProperty++;
            await next();
        }
        async function m3(request, handler, next){
            request.someTestProperty++;
            handler.writeHead();
            handler.write(request.someTestProperty);
        }
        server.setAccessMiddlewares({
            '1': m1,
            '2': m2,
            '3': m3
        });
        const data = await utilities.ping(port);console.log(data);
    });
});