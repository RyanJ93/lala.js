'use strict';

const Lala = require('../index');

// Defining routes.
// Getting the default router, in this case the "web" router, generally used to handle web requests over HTTP/HTTPS.
let router = Lala.Router.getDefaultRouter();

// Defining a GET route.
router.get('/', (request, handler) => {
    return new Lala.View('./views/index.ejs', {
        framework: 'Lala'
    });
});
// Defining the route for static assets.
router.resource('/assets', './public');

// Initializing Lala starting the servers defined in configuration file.
Lala.fallFromTheSky({
    config: './config/config.json'
}).then(() => {
    console.log('Your app is online! Yay! 😄');
}).catch((ex) => {
    console.log(ex);
});
