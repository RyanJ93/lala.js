'use strict';

const filesystem = require('fs');
const assert = require('assert');
const lala = require('../..');
const {
    generatePolicies,
    getPolicyIndexes
} = require('../utilities');

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

    it('Create and trigger the main route route.', async () => {
        router.get('/', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/',
            method: 'GET'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a GET route.', async () => {
        router.get('/test-trigger-get', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-get',
            method: 'GET'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-get' && resolvedRoute.getRoute().getMethod() === 'GET';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a POST route.', async () => {
        router.post('/test-trigger-post', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-post',
            method: 'POST'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-post' && resolvedRoute.getRoute().getMethod() === 'POST';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a PUT route.', async () => {
        router.put('/test-trigger-put', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-put',
            method: 'PUT'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-put' && resolvedRoute.getRoute().getMethod() === 'PUT';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a DELETE route.', async () => {
        router.delete('/test-trigger-delete', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-delete',
            method: 'DELETE'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-delete' && resolvedRoute.getRoute().getMethod() === 'DELETE';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a PATCH route.', async () => {
        router.patch('/test-trigger-patch', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-patch',
            method: 'PATCH'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-patch' && resolvedRoute.getRoute().getMethod() === 'PATCH';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a SEARCH route.', async () => {
        router.search('/test-trigger-search', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-search',
            method: 'SEARCH'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-search' && resolvedRoute.getRoute().getMethod() === 'SEARCH';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a route created with the any method.', async () => {
        router.any('/test-trigger-any', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/test-trigger-any',
            method: 'POST'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/test-trigger-any' && resolvedRoute.getRoute().getMethod() === '*';
        assert.deepEqual(result, true);
    });

    it('Create and trigger a route having a controller defined with the controller closure.', async () => {
        let executed = false;
        class TestController extends lala.Controller {
            test(){
                executed = true;
            }
        }
        router.get('/test-controller-closure', new lala.ControllerClosure(TestController, 'test'));
        const resolvedRoute = await factory.craft().process({
            url: '/test-controller-closure',
            method: 'GET'
        }, {});
        await resolvedRoute.getRoute().execute({}, {});
        assert.deepEqual(executed, true);
    });

    it('Changing a route property causing the route to be re-indexed.', async () => {
        const route = router.get('/index-test', (request, response) => {}, {
            language: 'it',
            name: 'index-test'
        });
        const successfullyResolvedRoute = await factory.craft().process({
            url: '/index-test',
            method: 'GET',
            languages: {
                it: 1
            }
        }, {});
        route.setLanguage('en');
        let unresolvedRoute = null;
        try{
            unresolvedRoute = await factory.craft().process({
                url: '/index-test',
                method: 'GET',
                languages: new Map([['it', 1]])
            }, {});
        }catch{}
        const result = successfullyResolvedRoute instanceof lala.ResolvedRoute && successfullyResolvedRoute.getRoute().getName() === 'index-test' && unresolvedRoute === null;
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
        const viewFactory = new lala.ViewFactory(__dirname + '/../resources/test.ejs');
        router.view('/view', viewFactory);
        const resolvedRoute = await factory.craft().process({
            url: '/view',
            method: 'GET'
        }, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute;
        if ( result ){
            const route = resolvedRoute.getRoute();
            result = route instanceof lala.ViewRoute && route.getViewFactory() === viewFactory;
        }
        assert.deepEqual(result, true);
    });

    it('Create a route containing parameters.', () => {
        let route = new lala.Route('GET', '/user/:username/posts/?:page', (request, response) => {});
        const result = route.getParameters().has('username') && route.getOptionalParameters().has('page');
        assert.deepEqual(result, true);
    });

    it('Creating ' + routes + ' routes containing a parameter and trigger last one.', async () => {
        for ( let i = 0 ; i < routes ; i++ ) {
             router.get('/test-' + i.toString() + '/:id/', (request, response) => { return 'OK' });
        }
        const resolvedRoute = await factory.craft().process({
            url: '/test-' + ( routes - 1 ).toString() + '/7777/',
            method: 'GET'
        }, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute;
        if ( result ){
            result = await resolvedRoute.getRoute().execute({}, {}) === 'OK';
        }
        assert.deepEqual(result, true);
    });

    it('Trigger a route containing a parameter.', async () => {
        router.get('/some/route/containing/a/:parameter/plus/?:option', (request, response) => {});
        const resolvedRoute = await factory.craft().process({
            url: '/some/route/containing/a/cat/plus/a-dog',
            method: 'GET'
        }, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute;
        if ( result ){
            result = resolvedRoute.getRoute().getPath() === '/some/route/containing/a/:parameter/plus/?:option';
            if ( result ){
                const parameters = resolvedRoute.getParameters();
                result = parameters.hasOwnProperty('parameter') && parameters.hasOwnProperty('option') && parameters.parameter === 'cat' && parameters.option === 'a-dog';
            }
        }
        assert.deepEqual(result, true);
    });

    it('Create and trigger a route containing both a parameter and an optional parameter.', async () => {
        router.get('/test/:param/section/?:id', (request, response) => {}, {
            name: 'test-optional-parameter'
        });
        const resolvedRoute = await factory.craft().process({
            url: '/test/123/section/456',
            method: 'GET'
        }, {});
        let result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getName() === 'test-optional-parameter';
        if ( result ){
            const parameters = Object.values(resolvedRoute.getParameters());
            result = parameters.indexOf('123') >= 0 && parameters.indexOf('456') >= 0;
        }
        assert.deepEqual(result, true);
    });

    it('Create and trigger a route containing a parameter and a filter on it.', async () => {
        router.get('/test/user/:id', (request, response) => {}, {
            filters: {
                id: '@number'
            },
            name: 'test-filtered-parameter'
        });
        let notFound = false;
        const resolvedRoute = await factory.craft().process({
            url: '/test/user/456',
            method: 'GET'
        }, {});
        try{
            await factory.craft().process({
                url: '/test/user/abc',
                method: 'GET'
            }, {});
        }catch(ex){
            if ( ex instanceof lala.NotFoundHTTPException ){
                notFound = true;
            }else{
                throw ex;
            }
        }
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getName() === 'test-filtered-parameter' && notFound;
        assert.deepEqual(result, true);
    });

    it('Resolving a route using the linear algorithm.', async () => {
        router.get('/linear/algo/test/:id', (request, response) => {}, {
            name: 'linear-algo-test'
        });
        const processor = factory.setRouteResolverAlgorithm('linear').craft();
        const resolvedRoute = await processor.process({
            url: '/linear/algo/test/123',
            method: 'GET'
        }, {});
        factory.setRouteResolverAlgorithm('subset');
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getName() === 'linear-algo-test';
        assert.deepEqual(result, true);
    });

    it('Defining a resource route.', () => {
        router.resource('/assets', './test/public/assets');
    });

    it('Accessing to a hidden file through a resource route.', async () => {
        router.resource('/assets/other', './test/public/other_assets');
        const resolvedRoute = await factory.craft().process({
            url: '/assets/other/.hidden_file',
            method: 'GET'
        }, {});
    });

    it('Creating a route and check the generated tag.', () => {
        const route = new lala.Route('GET', '/tags/:tagID/test/', (request, response) => {});
        assert.deepEqual(route.getTag(), 'tags-test');
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

    it('Compiling a route into an URL passing redundant parameters.', () => {
        const url = lala.RouteRepository.get('route-to-compile').compile({
            id: 12,
            sec: 'details',
            test: 56
        });
        assert.deepEqual(url, '/profile/12/section/details?test=56');
    });

    it('Defining some policies for some permissions.', () => {
        const policies = generatePolicies();
        lala.PermissionPolicyRegistry.associate('test.a', '1', new policies.A(1));
        lala.PermissionPolicyRegistry.associate('test.a.b', '2', new policies.B(2));
        lala.PermissionPolicyRegistry.associate('test.a.c', '3', new policies.C(3));
        lala.PermissionPolicyRegistry.associate('test.a.c.d', '4', new policies.A(4));
        lala.PermissionPolicyRegistry.associate('test.a.*', '5', new policies.D(5));
        lala.PermissionPolicyRegistry.associate('test.b', '6', new policies.A(6));
        lala.PermissionPolicyRegistry.associate('test.b.d', '7', new policies.A(7));
        lala.PermissionPolicyRegistry.associate('test.b.*', '8', new policies.B(8));
        lala.PermissionPolicyRegistry.associate('test.*', '9', new policies.C(9));
        lala.PermissionPolicyRegistry.associate('test.a', '10', new policies.A(10));
        lala.PermissionPolicyRegistry.associate('test.c', '11', new policies.E(11));
        lala.PermissionPolicyRegistry.associate('test.c.d', '12', new policies.F(12));
        lala.PermissionPolicyRegistry.associate('test.d.e', '13', new policies.D(13));
        lala.PermissionPolicyRegistry.associate('test.f.z', '14', new policies.B(14));
        const strictMatches = lala.PermissionPolicyRegistry.get('test.a.c'); // It should match number 3, 5, and 9.
        const strictMatchesWithWildcards = lala.PermissionPolicyRegistry.get('test.a'); // It should match number 1, 10 and 9.
        const wildcardMatches = lala.PermissionPolicyRegistry.get('test.a.*'); // It should match number 2, 3, 4, 5 and 9.
        const noMatches = lala.PermissionPolicyRegistry.get('not-test.a'); // It shouldn't match any number.
        const wildcardNoMatches = lala.PermissionPolicyRegistry.get('not-test.*');  // It shouldn't match any number.
        const indexes = [];
        indexes[0] = getPolicyIndexes(strictMatches);
        indexes[1] = getPolicyIndexes(strictMatchesWithWildcards);
        indexes[2] = getPolicyIndexes(wildcardMatches);
        indexes[3] = getPolicyIndexes(noMatches);
        indexes[4] = getPolicyIndexes(wildcardNoMatches);
        assert.deepEqual(indexes, [[ 3, 9, 5], [1, 10, 9], [2, 3, 4, 5, 9], [], []]);
    });

    it('Create and trigger a route defined with a prefix.', async () => {
        const prefixedRouter = new lala.Router();
        prefixedRouter.setPrefix('prefix');
        prefixedRouter.get('/', (request, response) => {});
        const prefixedFactory = new lala.processors.factories.RouteProcessorFactory();
        const resolvedRoute = await prefixedFactory.setRoutersAsArray([prefixedRouter]).craft().process({
            url: '/prefix',
            method: 'GET'
        }, {});
        const result = resolvedRoute instanceof lala.ResolvedRoute && resolvedRoute.getRoute().getPath() === '/' && resolvedRoute.getRoute().getMethod() === 'GET';
        assert.deepEqual(result, true);
    });
});
