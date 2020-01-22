'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const {
    HTTPServer,
    HTTPSServer,
    WSServer,
    WSSServer,
    UNIXSocketServer,
    ServerProviderRepository
} = require('../../Server');

/**
 * This class allows to setup the built-in servers.
 */
class ServerProvider extends Provider {
    /**
     * Registers the built-in servers.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        ServerProviderRepository.register('http', HTTPServer);
        ServerProviderRepository.register('https', HTTPSServer);
        ServerProviderRepository.register('ws', WSServer);
        ServerProviderRepository.register('wss', WSSServer);
        ServerProviderRepository.register('unix', UNIXSocketServer);
    }
}

module.exports = ServerProvider;