const lala = require('..');

lala.fallFromTheSky().then(async () => {
    lala.Logger.setSentryDNS('https://e99f8780d7604ba0b3b9bfea8295d14a@sentry.io/1417171');
    const router = lala.RouterRepository.get('web');
    const APIrouter = lala.RouterRepository.get('api');


    console.time('test');
    router.post('/', (request, handler) => {
        return 'OK';
    });

    router.get('/perf', (request, handler) => {
        return 'OK';
    });
    for ( let i = 0 ; i <= 60000 ; i++ ){
       // APIrouter.get('/another-api-test-' + i, () => {});
       // router.resource('/assets-' + i, './test');
       // APIrouter.resource('/api-assets-' + i, './test');
    }
    APIrouter.setPrefix('/api/v2/');
    for ( let i = 0 ; i <= 250 ; i++ ){
        router.get('/another-test-' + i + '/:user/:page/:slug', (request, response) => {
            response.setHeader('Content-Type', 'text/html');
            let data = '';
            data = '<h1>It Works!!</h1>';
            data += '<h2>Stats:</h2>';
            data += '<span>routingTime: ' + request.routingTime.toFixed(3) + ' ms</span><br />';
            data += '<span>cachedRouteLookupTime: ' + request.cachedRouteLookupTime.toFixed(3) + ' ms</span><br />';
            data += '<span>routeParamsProcessingTime: ' + request.routeParamsProcessingTime.toFixed(3) + ' ms</span><br />';
            data += '<span>routeFromCache: ' + ( request.routeFromCache ? 'Yes' : 'No' ) + '</span><br />';
            data += '<span>routeCached: ' + ( request.routeCached ? 'Yes' : 'No' ) + '</span><br />';
            return data;
        });
    }

    router.resource('/assets/', './live-test/local-assets');
    console.timeEnd('test');
    router.addParamMiddleware('name', async (param, request, response, next) => {
        await next();
    }, 'name');
    router.addParamMiddleware('surname', async (param, request, response, next) => {
        await next();
    }, 'surname');
    router.addParamMiddleware('page', async (param, request, response, next) => {
        await next();
    }, 'page');
    router.get('/test/:userID/:name/:surname/profile/:section/show/', (request, handler) => {
        return 'OK';
    });
    router.view('/', __dirname + '/local-assets/test.ejs');
    router.get('/perf', (request, response) => {
        return 'OK';
    });
    // http://localhost:2345/test/56/test/rt/profile/comments/show/
    // http://enrico:test@localhost:2345/test/56/test/rt/profile/comments/show/
/*
    const cache = new lala.Cache();
    const connection = new lala.DatabaseConnections.RedisConnection();
    await connection.setPassword('test').setDatabase(5).connect();
    await cache.setDriver('redis');
    cache.setConnection(connection);
*/
    const authenticator = new lala.DigestHTTPAuthentication();

    authenticator.setCredentialsAsObject({
        enrico: {
            password: 'test',
            userData: {
                name: 'Enrico',
                surname: 'Sola'
            }
        }
    }).setCredentialsFile('./live-test/credentials.json');
    authenticator.getCredentialsProvider().setCredentialsPreloading(true);
   // router.setAuthenticator(authenticator).setAuth(true);
    const server = new lala.HTTPServer();
    server.setPort(2345).setRoutersByName(['web', 'api']);
    /*
    server.addExceptionHandler(lala.InvalidArgumentException, (ex, request, handler) => {
        console.log(ex);
    });
    */

    router.get('/test-cookie', (request, response) => {
        response.setCookie('test', '2');
        return Array.from(request.cookies.entries());
    });

    const IPFilterRule = new lala.firewallRules.IPFilterRule();
    IPFilterRule.setAllowedIPs(['::1', '127.0.0.1', '192.168.1.*', '::ffff:127.0.0.1']).setAllowedOnly(true);
    const RequestCountRule = new lala.firewallRules.RequestCountRule(20000000);
    RequestCountRule.setRetryAfter(3600);
    server.getFirewall().addRule(RequestCountRule).addRule(IPFilterRule);

    await server.start();
}).catch((ex) => {
    console.log(ex);
});
