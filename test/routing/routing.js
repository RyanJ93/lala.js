'use strict';

const filesystem = require('fs');
const assert = require('assert');
const lala = require('../..');

describe('Testing the routing engine.', () => {
    let router = null;
    const routes = 50000;
    const factory = new lala.processors.factories.RouteProcessorFactory();

    it('Get the default router.', () => {
        router = lala.RouterRepository.getDefault();
        factory.setRoutersAsArray([router]);
        const valid = router instanceof lala.Router && router === lala.RouterRepository.get('web');
        assert.deepEqual(valid, true);
    });

    it('Create and trigger a normal route.', async () => {
        router.get('/test', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test',
            method: 'GET'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test';
        assert.deepEqual(result, true);
    });

    it('Triggering a non-existing route.', async () => {
        let result = null;
        try{
            result = await factory.craft().process({
                url: '/404',
                method: 'GET'
            }, {});
        }catch(ex){
            result = ex;
        }finally{
            assert.deepEqual(result instanceof lala.NotFoundHTTPException, true);
        }
    });

    it('Create and trigger a redirect route.', async () => {
        router.redirect('/redirect', '/target');
        const resolvedRoute = await factory.craft().process({
            url: '/redirect',
            method: 'GET'
        }, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute;
        if ( result ){
            const route = resolvedRoute.getRoute();
            result = route instanceof lala.RedirectRoute && route.getTarget() === '/target';
        }
        assert.deepEqual(result, true);
    });

    it('Create and trigger a resource route.', async () => {
        const location = __dirname + '/../resources/';
        const request = {
            url: '/assets/test.txt',
            method: 'GET'
        };
        router.resource('/assets', location);
        const resolvedRoute = await factory.craft().process(request, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute;
        if ( result ){
            const route = resolvedRoute.getRoute();
            result = route instanceof lala.ResourceRoute && route.getPath() === '/assets' && route.getLocation() === location;
            if ( result ){
                request.resolvedRoute = resolvedRoute;
                const response = await route.execute(request, {});
                result = response instanceof lala.responses.FileResponse && filesystem.existsSync(response._path);
            }
        }
        assert.deepEqual(result, true);
    });

    it('Create and trigger a view route.', async () => {
        const view = new lala.View(__dirname + '/../resources/test.ejs');
        router.view('/view', view);
        const resolvedRoute = await factory.craft().process({
            url: '/view',
            method: 'GET'
        }, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute;
        if ( result ){
            const route = resolvedRoute.getRoute();
            result = route instanceof lala.ViewRoute && route.getView() === view;
        }
        assert.deepEqual(result, true);
    });

    it('Create a route containing parameters.', () => {
        let route = new lala.Route('GET', '/user/:username/posts/?:page', (request, response) => {});
        const result = route.getParameters().has('username') && route.getOptionalParameters().has('page');
        assert.deepEqual(result, true);
    });

    it('Creating ' + routes + ' routes containing a parameter.', () => {
        for ( let i = 0 ; i < routes ; i++ ) {
            router.get( '/test-' + i.toString() + '/:id/', (request, response) => {});
        }
    });

    it('Trigger a route containing a parameter.', async () => {
        const path = '/test-' + ( routes - 10 ).toString();
        const resolvedRoute = await factory.craft().process({
            url: path + '/6766/',
            method: 'GET'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === ( path + '/:id/' );
        assert.deepEqual(result, true);
    });

    it('Defining a resource route.', () => {
        router.resource('/assets', './test/public/assets');
    });

    it('Add a middleware to a route.', () => {
        router.get('/midleware-test', (request, response) => {
            const first = response.hasOwnProperty('middlewareExecuted') && response.middlewareExecuted === true;
            return response.hasOwnProperty('routeMiddlewareExecuted') && response.routeMiddlewareExecuted === true && first ? '1' : '0';
        }, {
            middlewares: {
                test: async (request, response, next) => {
                    response.middlewareExecuted = true;
                    await next();
                }
            }
        });
    });

    it('Add a middleware to all routes for this router.', () => {
        router.addMiddleware('com.test.routeMiddleware', async (request, response, next) => {
            response.routeMiddlewareExecuted = true;
            await next();
        });
    });

    it('Trigger a middleware for both a route and the route it belongs to.', async () => {
        const request = {
            url: '/midleware-test',
            method: 'GET'
        };
        const response = {};
        let output = null;
        const resolvedRoute = await factory.craft().process(request, response);
        if ( resolvedRoute !== null ){
            const route = resolvedRoute.getRoute();
            await resolvedRoute.getRouter().runMiddlewares(request, response);
            await route.runMiddlewares(request, response);
            output = await route.execute(request, response);
        }
        assert.deepEqual(output, '1');
    });

    it('Defining a middleware function to process a route parameter.', () => {
        const fn = async(parameters, request, response, next) => {
            parameters.userID = parameters.hasOwnProperty('userID') ? parseInt(parameters.userID) : 0;
            await next();
        };
        router.addParamMiddleware( 'com.lala.test.userIDHandler', fn, [ 'id', 'userID', '', false ] );
        // TODO: Find a better solution to do this: we shouldn't use properties meant to be private.
        const handlers = router._paramMiddlewares.handlers;
        const parameters = router._paramMiddlewares.parameters;
        const result = handlers.has('com.lala.test.userIDHandler') && parameters.has('id') && parameters.has('userID');
        assert.deepEqual(result, true);
    });

    it('Mutate a parameter using the defined middleware.', (done) => {
        router.get('/blog/:userID/post/:postID', (request, response) => {
            done(assert.deepEqual(request.query.userID, 89));
        }, {
            filter: {
                userID: '[0-9]+'
            }
        });
        factory.craft().process({
            url: '/blog/89/post/66?page=2',
            method: 'GET'
        }, {}).then((resolvedRoute) => {
            if ( resolvedRoute !== null ){
                resolvedRoute.getRoute().execute({
                    query: {userID: 89}
                });
            }
        });
    });

    it('Removing the created middleware function for request parameters.', () => {
        router.removeParamMiddleware('com.lala.test.userIDHandler');
        const result = router._paramMiddlewares.handlers.size === 0 && router._paramMiddlewares.parameters.size === 0;
        assert.deepEqual(result, true);
    } );

    it('Rejecting a request using a middleware.', (done) => {
        let called = false;
        router.addMiddleware('com.lala.test.denyRequest', async (request, response, next) => {
            // Don't invoke "next" function in order to prevent request processing.
            if ( request.url !== '/reject' ){
                await next();
            }
        });
        router.addMiddleware('com.lala.test.useless', async (request, response, next) => {
            // An useless middleware that won't be invoked.
            await next();
        });
        router.get('/reject', (request, response) => {
            called = true;
        });
        factory.craft().process({
            url: '/reject',
            method: 'GET'
        }, {}).then((resolvedRoute) => {
            if ( resolvedRoute !== null ){
                resolvedRoute.getRouter().runMiddlewares({}, {}).then((result) => {
                    done();
                });
            }
        });
    });

    it('Get route by name and by unique ID.', () => {
        const name = 'test-name';
        router.get('/test-name', (request, response) => {}, {
            name: name
        });
        const routeByName = lala.RouteRepository.get(name);
        const routeByID = routeByName === null ? null : lala.RouteRepository.get(routeByName.getID());
        const result = routeByName instanceof lala.Route && routeByID instanceof lala.Route && routeByName.getName() === name && routeByID.getName() === name;
        assert.deepEqual(result, true);
    });

    it('Compiling a route into an URL.', () => {
        const name = 'route-to-compile';
        router.get('/profile/:id/section/:sec/?:page', (request, response) => {}, {
            name: name
        });
        const url = lala.RouteRepository.get(name).compile({
            id: 9,
            sec: 'comments'
        });
        assert.deepEqual(url, '/profile/9/section/comments');
    });
});
