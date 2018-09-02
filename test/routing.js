'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Routing features.', () => {
    describe('Basic routing features.', () => {
        let router = lala.Router.getDefaultRouter();
        it('Route creation.', () => {
            router.get('/test', () => {
                console.log('Route triggered successfully.');
                assert.ok('Route triggered successfully.');
            });
            assert.ok('Route created.');
        });
        it('Add a addMiddleware to all routes for this router.', () => {
            router.addMiddleware('com.test.addMiddleware', () => {
                console.log('Middleware triggered successfully.');
            });
        });
        it('Trigger the created route.', () => {
            function test(){

            }global.test = test;
            lala.Router.handle({
                path: '/test',
                method: 'GET'
            }, {});
        });
    });
});