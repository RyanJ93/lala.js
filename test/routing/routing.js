'use strict';

const assert = require('assert');
const lala = require('../..');
const utilities = require('../utilities');

describe('Testing the routing engine.', () => {
    let router = null;
    const routes = 10000;

    it('Get the default router.', () => {
        router = lala.RouterRepository.getDefault();
        const valid = router instanceof lala.Router && router === lala.RouterRepository.get('web');
        assert.deepEqual(valid, true);
    });

    it('Create and trigger normal route.', async () => {
        router.get('/test', () => {
            return true;
        });
        const route = lala.Router.route({
            url: '/test',
            method: 'GET'
        }, {
            routers: [router]
        });
        const result = typeof route.handler === 'function' ? await route.handler() : false;
        assert.deepEqual(result, true);
    });

    it('Create a route containing parameters.', () => {
        let route = new lala.Route();
        route.setPath('/user/:username/posts/:?page');
        const result = route.getParameters().has('username') && route.getOptionalParameters().has('page');
        assert.deepEqual(result, true);
    });

    it('Creating ' + routes + ' routes containing a parameter.', () => {
        for ( let i = 0 ; i < routes ; i++ ) {
            router.get( '/test-' + i.toString() + '/:id/', () => true);
        }
    });

    it('Trigger a route containing a parameter.', async () => {
        const route = lala.Router.route({
            url: '/test-' + ( routes - 10 ).toString() + '/6766/',
            method: 'GET'
        }, {
            routers: [router]
        });
        const result = typeof route.handler === 'function' ? await route.handler() : false;
        assert.deepEqual(result, true);
    });

    it('Defining a resource route.', () => {
        router.resource('/assets', './test/public/assets');
    });

    it('Add two global middlewares.', () => {
        lala.Router.addGlobalMiddleware('com.test.globalMiddleware', async(request, handler, next) => {
            //console.log('Middleware ("com.test.globalMiddleware") triggered successfully.');
            await next();
        });
        lala.Router.addGlobalMiddleware('com.test.globalMiddleware2', async(request, handler, next) => {
            //console.log('Middleware ("com.test.globalMiddleware2") triggered successfully.');
            await next();
        });
    });
    it('Add a middleware to all routes for this router.', () => {
        router.addMiddleware('com.test.routeMiddleware', async(request, handler, next) => {
            //console.log('Middleware ("com.test.routeMiddleware") triggered successfully.');
            await next();
        } );
    });
    it( 'Defining a middleware function to process a route parameter.', () => {
        const fn = async(parameters, request, handler, next) => {
            //console.log('Middleware ("com.test.userIDHandler") triggered successfully.');
            parameters.userID = parseInt(parameters.userID);
            await next();
        };
        router.addParamMiddleware( 'com.lala.test.userIDHandler', fn, [ 'id', 'userID', '', false ] );
        assert.deepEqual(router.paramMiddlewares, {
            handlers: {
                [ 'com.lala.test.userIDHandler' ]: {
                    handler: fn,
                    params: [ 'id', 'userID' ]
                },
            },
            params: {
                id: [ 'com.lala.test.userIDHandler' ],
                userID: [ 'com.lala.test.userIDHandler' ]
            }
        }, 'Middleware appears to have been created wrongly.');
    } );
    it( 'Mutate a parameter using the defined middleware.', ( done ) => {
        router.get( '/blog/:userID/post/:postID', (request) => {
            done(assert.deepEqual(request.query.userID, 89, 'Parameter value appears to has not been mutated by the middleware.'));
        }, {
            filter: {
                userID: '[0-9]+'
            }
        } );
        lala.Router.handle({
            url: '/blog/89/post/66?page=2',
            method: 'GET'
        }, response, {});
    } );
    it( 'Removing the created middleware function for request parameters.', () => {
        router.removeParamMiddleware( 'com.lala.test.userIDHandler' );
        assert.deepEqual( router.paramMiddlewares, {
            handlers: {},
            params: {}
        }, 'Middleware appears to have been created wrongly.' );
    } );
    it('Rejecting a request using a middleware.', (done) => {
        let called = false;
        router.addMiddleware('com.lala.test.denyRequest', async (request, handler, next) => {
            // Don't invoke "next" function in order to prevent request processing.
            if ( request.url !== '/reject' ){
                await next();
            }
        });
        router.addMiddleware('com.lala.test.useless', async (request, handler, next) => {
            // An useless middleware that won't be invoked.
            await next();
        });
        router.get('/reject', (request, handler) => {
            called = true;
        });
        lala.Router.handle({
            url: '/reject',
            method: 'GET'
        }, response, {}).then(() => {
            done(called === true ? new Error('Route has been invoked despite middleware.') : null);
        }).catch((ex) => {
            done();
        });
    });
});


describe('Routing features.', () => {return;
    // Testing routes with the "web" router.
    let router = lala.Router.getDefaultRouter();
    // Defining a fake "response" object.
    let response = {
        writeHead: () => {},
        end: () => {},
        write: () => {}
    };

    describe('Route creation', () => {
        it( 'Route creation.', () => {
            // Add a route using the "GET" HTTP method.
            router.get('/test', () => {
                it( 'Route trigger.', () => {
                    console.log( 'Route triggered successfully.' );
                } );
            });
            // TODO: Add local middleware and param middleware tests for this route.
        } );
        it('Creating 25000 routes containing a parameter.', () => {
            for (let i = 0; i < 50000; i++) {
                router.get( '/test-' + i.toString() + '/:id/', () => {
                } );
            }
        });
        it('Creating a route having an async handler function.', () => {
            router.get( '/test-async', () => {
                it( 'Async route trigger.', async() => {
                    await setTimeout( 100, async() => {
                        console.log( 'Async route triggered successfully.' );
                    } );
                } );
            } );
        });
        it('Defining a resource route.', () => {
            router.resource('/assets', './test/public/assets');
        });
    });
    describe('Middleware operations.', () => {
        it('Add two global middlewares.', () => {
            lala.Router.addGlobalMiddleware('com.test.globalMiddleware', async(request, handler, next) => {
                //console.log('Middleware ("com.test.globalMiddleware") triggered successfully.');
                await next();
            });
            lala.Router.addGlobalMiddleware('com.test.globalMiddleware2', async(request, handler, next) => {
                //console.log('Middleware ("com.test.globalMiddleware2") triggered successfully.');
                await next();
            });
        });
        it('Add a middleware to all routes for this router.', () => {
            router.addMiddleware('com.test.routeMiddleware', async(request, handler, next) => {
                //console.log('Middleware ("com.test.routeMiddleware") triggered successfully.');
                await next();
            } );
        });
        it( 'Defining a middleware function to process a route parameter.', () => {
            let fn = async(parameters, request, handler, next) => {
                //console.log('Middleware ("com.test.userIDHandler") triggered successfully.');
                parameters.userID = parseInt(parameters.userID);
                await next();
            };
            router.addParamMiddleware( 'com.lala.test.userIDHandler', fn, [ 'id', 'userID', '', false ] );
            assert.deepEqual( router.paramMiddlewares, {
                handlers: {
                    [ 'com.lala.test.userIDHandler' ]: {
                        handler: fn,
                        params: [ 'id', 'userID' ]
                    },
                },
                params: {
                    id: [ 'com.lala.test.userIDHandler' ],
                    userID: [ 'com.lala.test.userIDHandler' ]
                }
            }, 'Middleware appears to have been created wrongly.' );
        } );
        it( 'Mutate a parameter using the defined middleware.', ( done ) => {
            router.get( '/blog/:userID/post/:postID', (request, handler) => {
                done(assert.deepEqual(request.query.userID, 89, 'Parameter value appears to has not been mutated by the middleware.'));
            }, {
                filter: {
                    userID: '[0-9]+'
                }
            } );
            lala.Router.handle({
                url: '/blog/89/post/66?page=2',
                method: 'GET'
            }, response, {});
        } );
        it( 'Removing the created middleware function for request parameters.', () => {
            router.removeParamMiddleware( 'com.lala.test.userIDHandler' );
            assert.deepEqual( router.paramMiddlewares, {
                handlers: {},
                params: {}
            }, 'Middleware appears to have been created wrongly.' );
        } );
        it('Rejecting a request using a middleware.', (done) => {
            let called = false;
            router.addMiddleware('com.lala.test.denyRequest', async (request, handler, next) => {
                // Don't invoke "next" function in order to prevent request processing.
                if ( request.url !== '/reject' ){
                    await next();
                }
            });
            router.addMiddleware('com.lala.test.useless', async (request, handler, next) => {
                // An useless middleware that won't be invoked.
                await next();
            });
            router.get('/reject', (request, handler) => {
                called = true;
            });
            lala.Router.handle({
                url: '/reject',
                method: 'GET'
            }, response, {}).then(() => {
                done(called === true ? new Error('Route has been invoked despite middleware.') : null);
            }).catch((ex) => {
                done();
            });
        });
    });
    describe('Middleware operations.', () => {
        it('Trigger the created route.', () => {
            // Simulating an HTTP request.
            lala.Router.handle({
                url: '/test',
                method: 'GET'
            }, response).then((() => {
                assert.ok('Route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the route.');
            });
        });
        it('Trigger the created route (async).', () => {
            // Simulating an HTTP request.
            lala.Router.handle({
                url: '/test-async',
                method: 'GET'
            }, response).then((() => {
                assert.ok('Async route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the async route.');
            });
        });
        it('Trigger the created resource route.', () => {
            // Simulating an HTTP request.
            lala.Router.handle({
                url: '/assets/icon.png',
                method: 'GET'
            }, response).then((() => {
                assert.ok('Route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the route.');
            });
        });
        it('Routing using multiple path in a single route', () => {
            router.get(['/multi-1', '/multi-2'], () => {
                assert.ok('Route triggered.');
            });
        });
        it('Triggering the route having multiple path defined.', () => {
            lala.Router.handle({
                url: '/multi-2',
                method: 'GET'
            }, response).then((() => {
                assert.ok('Route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the route.');
            });
        });
        it('Routing using a regex as path.', () => {
            router.get(/path-[a-zA-Z0-9]{1,3}/, () => {
                assert.ok('Route triggered.');
            });
        });
        it('Triggering the route having a regex as path.', () => {
            lala.Router.handle({
                url: '/path-2a',
                method: 'GET'
            }, response).then((() => {
                assert.ok('Route triggered.');
            })).catch((ex) => {
                console.log(ex);
                assert.fail('An error occurred while triggering the route.');
            });
        });
        it('Defining a route with parameters.', () => {
            router.get('/user/:id', () => {

            });
        });
        it('Converting the route path into a regex.', () => {
            let route = lala.Router._prepareRoutePath('/user/:id/:?username/info', {
                filters: {
                    id: '[0-9]+'
                }
            });
            //console.log(route);
        });
        it('Triggering a route by using the raw method.', () => {
            router.get('/_user/:username/article/:id', () => {}, {
                filters: {
                    id: '[0-9]+'
                }
            });
            let route = lala.Router.route({
                url: '/_user/sigTest/article/345',
                method: 'GET'
            }, response);
            // console.log(route);
        });
        it('Simulating 404 by using the raw method.', () => {
            router.get('/', () => {});
            let route = lala.Router.route({
                url: '/not-found',
                method: 'GET'
            }, response);
            assert.deepEqual(route, null, 'A route appears to has been found while no such route has been defined.');
        });
    });
});
