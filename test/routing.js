'use strict';

const assert = require('assert');
const lala = require('../index');

describe('Routing features.', () => {
    describe('Basic routing features.', () => {
        // Testing routes with the "web" router.
        let router = lala.Router.getDefaultRouter();
        it('Route creation.', () => {
            // Add a route using the "GET" HTTP method.
            router.get('/test', () => {
                it('Route trigger.', () => {
                    console.log('Route triggered successfully.');
                    assert.ok('Route triggered successfully.');
                });
            });
            assert.ok('Route created.');
        });
        it('Add a addMiddleware to all routes for this router.', () => {
            router.addMiddleware('com.test.addMiddleware', () => {
                console.log('Middleware triggered successfully.');
            });
        });
        it('Trigger the created route.', () => {
            // Simulating an HTTP request.
            lala.Router.handle({
                url: '/test',
                method: 'GET'
            }, {}).then((() => {
                assert.ok('Route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the route.');
            });
        });
        it('Defining a resource route.', () => {
            router.resource('/assets', '/public/assets');
        });
        it('Trigger the created resource route.', () => {
            // Simulating an HTTP request.
            lala.Router.handle({
                url: '/assets/icon.png',
                method: 'GET'
            }, {}).then((() => {
                assert.ok('Route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the route.');
            });
        });
    });
});
