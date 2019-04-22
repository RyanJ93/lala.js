'use strict';

// Including Lala's modules.
const HTTPSServer = require('./HTTPSServer');
const WSServer = require('./WSServer');
const { mixin } = require('../helpers');

class WSSServer extends WSServer {

}

module.exports = WSSServer;