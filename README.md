# Lala.js

<p align="center">
[a cute logo soon here]
</p>

Node is Fun!

## About Lala.js

Lala.js is a fast yet complete JavaScript framework for Node.js with as few dependencies as possible.
<br />Its final goal is to provide a powerful way to build great Node apps having all the basic instruments out-of-the-box without the need to fill your project with annoying dependencies.

**Note: This project is currently under heavy development!**

## Features

- Simple and fast **routing engine** with **middleware** support.
- Built-in **caching** supporting several services such as **Redis** and **Memcached**.
- Extensive server support for both **HTTP** and **HTTPS**, including **file uploads**, **range requests**, **content negotiation** and **compression** (**Gzip**, **Deflate** and **Brotli**).
- Integrated APIs for **HTTP caching**, **CORS**, **CSRF** and **CSP** management.
- Built-in **directory listing**.
- **WebSocket** support, including SSL and messaging API.
- **Form validation** and **typecasting**.
- **View** support through **Ejs** (or your favourite engine as well).
- **Logging API** based on several reporting methods (including **Sentry**).
- Big fan of the **MVC** pattern.
- And more incoming, including **ORM**, **commands**, **file storage**, **events** and **microservices**.

## Installation

As this project is currently under heavy development, it isn't available on NPM yet, you need to install it from this repository using your favourite package manager.
<br />Before installing, make sure Node.js is installed on your system, the minimum Node.js required version is 13. 
For instance, if you want to install Lala.js using NPM, you can issue this command:

```bash
npm i git+https://git@github.com/RyanJ93/lala.js
```

## Examples

Simple Lala.js application:

```javascript
'use strict'

const lala = require('@lala.js/core');

lala.init().then(async () => {
    const router = lala.RouterRepository.get('web');
    router.get('/', () => {
        return 'Hello World!!';
    });
    const server = new lala.HTTPServer();
    await server.setPort(8080).setRoutersByName(['web']).start();
}).catch((ex) => console.log(ex));
```
Play with this sample on [Repl.it](https://repl.it/@ryanj93/HelloWorld).

Add a middleware router wide:

```javascript
router.addMiddleware('some-middleware', async (request, response, next) => {
    // Do something here.
    await next();
});
```

Serving a file:

```javascript
router.get('/file', (request, response) => {
    return response.download('/path/to/file');
});

// OR

router.get('/file', (request, response) => {
    return new lala.responses.FileResponse('/path/to/file');
});
```

Serving a view:

```javascript
router.view('/view', '/path/to/view.ejs');

// OR

router.get('/view', (request, response) => {
    return response.view('/path/to/view.ejs', {
        some: 'params'
    });
});

// OR

router.get('/view', (request, response) => {
    const factory = new lala.ViewFactory('/path/to/view.ejs');
    return factory.craft({
        some: 'params'
    });
});
```

Serving static assets: 

```javascript
router.resource('/public', './local/assets', {
    directoryListing: false // true if you want to navigate directories from your browser.
});
```

Create a server and configure HTTP caching, CSP and CORS globally:

```javascript
// Set-up HTTP caching.
const server = new lala.HTTPServer();
const HTTPCacheManager = new lala.HTTPHeaderManagers.HTTPCacheHeaderManager();
HTTPCacheManager.setMIMETypeCaching('text/javascript', 3600);
HTTPCacheManager.setMIMETypeCaching('text/html', 600);
server.getOutputProcessorFactory().getHeaderManagers().push(HTTPCacheManager);

// Set-up a CSP policy.
const cspHeaderManager = new lala.HTTPHeaderManagers.CSPHeaderManager();
cspHeaderManager.setDirective(lala.HTTPHeaderManagers.CSPHeaderManager.DEFAULT_SRC, ["'self'"]);
server.getOutputProcessorFactory().getHeaderManagers().push(cspHeaderManager);

// Set-up CORS.
const corsOptions = new lala.ServerSupport.CORSOptions();
corsOptions.setAllowOrigin('*').setAllowMethods(['GET', 'POST', 'OPTIONS']).setAllowHeaders(['X-PINGOTHER', 'Content-Type']);
server.getRouteProcessorFactory().setCORSOptions(corsOptions);
```

## Tests

Make sure to install all the required dependencies, then simply run `npm test`.

## Stay tuned

Follow and interact with the community on [Slack](https://join.slack.com/t/lalajs/shared_invite/zt-bq06yw7m-_88xeSAc7YH~1ytbE_AdJg), [Telegram](https://t.me/1287126580) and [Discord](https://discord.gg/PpNS22).

## Contributing

Thank you for considering contributing to the Lala.js framework! As this project is in its early stage, we are seeking for any kind of contributions: feel free to submit your suggestions, bug reports or pull requests, they will be really appreciated!
Have a look to our contributing guide here.

## Bugs and security vulnerabilities

If you spot a bug, feel free to report it by opening a issue on this GitHub repository. if you discover a security vulnerability within Lala.js instead, please report in a more discrete way by sending an e-mail to ryanj93@lalajs.moe.

## License

The Lala.js framework is open-sourced software licensed under the MIT license.


Proudly developed with ❤️ by [Enrico Sola](https://www.enricosola.com).