const lala = require('..');


const index = new lala.WeakIndex();
const _index = new WeakMap();
let test = {t:8};
index.set('test', test);
_index.set(test, 'test');
/*
console.log('wi', index.get('test'));
console.log('wm', _index.get(test));

setTimeout(() => {
    console.log(test);
    console.log('wi', index.get('test'));
    console.log('wm', _index.get(test));
}, 3000);
*/

lala.fallFromTheSky().then(async () => {
    lala.Logger.setSentryDNS('https://e99f8780d7604ba0b3b9bfea8295d14a@sentry.io/1417171');
    const router = lala.RouterRepository.get('web');
    const APIrouter = lala.RouterRepository.get('api');


    console.time('test');
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
    lala.Router.addGlobalParamMiddleware('userID', async (param, request, response, next) => {
        //console.log('name', 4);
        await next();
    }, 'userID');
    router.get('/test/:userID/:name/:surname/profile/:section/show/', (request, handler) => {
        return 'OK';
    });
    router.view('/', './live-test/local-assets/test.ejs');
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
    router.setAuthenticator(authenticator).setAuth(true);
    const server = new lala.HTTPServer();
    server.setPort(2345).setRoutersByName(['web', 'api']).setRoutingCache(false);
    server.addExceptionHandler(lala.InvalidArgumentException, (ex, request, handler) => {
        console.log(ex);
    });
    await server.start();
    test = null;
}).catch((ex) => {
    console.log(ex);
});