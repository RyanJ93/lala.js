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
 *
 */
class ServerProvider extends Provider {
    /**
     *
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