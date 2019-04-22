'use strict';

module.exports = {
    //server: require('./server'),
    HTTPServer: require('./HTTPServer')
};

const lala = require('../..');
let router = new lala.Router();
router.get('/', () => {
    return 'It Works!!';
})
let server = new lala.HTTPServer();
server.setPort(2345).setRouters([router]).start();