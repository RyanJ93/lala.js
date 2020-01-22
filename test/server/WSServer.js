'use strict';

const assert = require('assert');
const WebSocket = require('ws');
const lala = require('../..');
const MessageQueue = require('../../lib/Server/support/MessageQueue');
const {
    fetchHTTPResponse,
    asyncListener
} = require('../utilities');

describe('Testing WebSocket server capabilities.', () => {
    let server = null, clients = [], messageQueue = new MessageQueue();

    it('Starting a new WebSocket server.', async () => {
        server = new lala.WSServer();
        server.setPort(11224);
        server.getWSConnectionProcessorFactory().setAllowAnonymousOrigin(true);
        await server.start();
        server.setMessageController((message) => message.getMessage());
        clients[0] = new WebSocket('ws://127.0.0.1:11224');
        await asyncListener(clients[0], 'open');
        clients[0].send('msg');
        const message = await asyncListener(clients[0], 'message');
        server.setMessageController(null);
        assert.deepEqual(message, 'msg');
    });

    it('Toggle HTTP protocol support.', async () => {
        const deniedResult = await fetchHTTPResponse('http://127.0.0.1:11224');
        server.setAllowHTTPConnections(true);
        const allowedResult = await fetchHTTPResponse('http://127.0.0.1:11224');
        server.setAllowHTTPConnections(false);
        const result = deniedResult.statusCode === 400 && allowedResult.statusCode !== 400;
        assert.deepEqual(result, true);
    });

    it('Connect a new client and assign a tag to it.', async () => {
        server.setMessageController((message) => {
            const text = message.getMessage();
            if ( text === 'msg2' ){
                message.getSender().addTag('tag');
            }
            return text;
        });
        clients[1] = new WebSocket('ws://127.0.0.1:11224');
        await asyncListener(clients[1], 'open');
        clients[1].send('msg2');
        const message = await asyncListener(clients[1], 'message');
        server.setMessageController(null);
        assert.deepEqual(message, 'msg2');
    });

    it('Connect a new client to a different channel.', async () => {
        server.setMessageController(() => {
            return 'another-channel';
        }, 'another-channel');
        clients[2] = new WebSocket('ws://127.0.0.1:11224/another-channel');
        await asyncListener(clients[2], 'open');
        clients[2].send('msg');
        const message = await asyncListener(clients[2], 'message');
        server.setMessageController(null);
        assert.deepEqual(message, 'another-channel');
    });

    it('Authenticate a client.', async () => {
        server.getWSAuthorizationProcessorFactory().setCallback((connection) => {
            return connection.channel === 'allowed-ch';
        });
        server.setMessageController((message) => message.getMessage());
        clients[3] = new WebSocket('ws://127.0.0.1:11224/allowed-ch');
        await asyncListener(clients[3], 'open');
        clients[3].send('msg');
        const message = await asyncListener(clients[3], 'message');
        clients[4] = new WebSocket('ws://127.0.0.1:11224/not-allowed-ch');
        await asyncListener(clients[4], 'close');
        server.getWSAuthorizationProcessorFactory().setCallback(null);
        server.setMessageController(null);
        assert.deepEqual(message, 'msg');
    });

    it('Broadcast a message to multiple clients by their channel.', async () => {
        clients[5] = new WebSocket('ws://127.0.0.1:11224/broadcast-channel');
        clients[6] = new WebSocket('ws://127.0.0.1:11224/broadcast-channel');
        await Promise.all([
            asyncListener(clients[5], 'open'),
            asyncListener(clients[6], 'open')
        ]);
        await server.broadcast('broadcast message', 'broadcast-channel');
        const messages = await Promise.all([
            asyncListener(clients[5], 'message'),
            asyncListener(clients[6], 'message')
        ]);
        const result = messages[0] === 'broadcast message' && messages[1] === 'broadcast message';
        assert.deepEqual(result, true);
    });

    it('Assign some tags to clients and send a message to some tagged clients.', async () => {
        clients[7] = new WebSocket('ws://127.0.0.1:11224/tagged');
        clients[8] = new WebSocket('ws://127.0.0.1:11224/tagged');
        clients[9] = new WebSocket('ws://127.0.0.1:11224/tagged');
        clients[10] = new WebSocket('ws://127.0.0.1:11224/tagged');
        clients[11] = new WebSocket('ws://127.0.0.1:11224/tagged');
        await Promise.all([
            asyncListener(clients[7], 'open'),
            asyncListener(clients[8], 'open'),
            asyncListener(clients[9], 'open'),
            asyncListener(clients[10], 'open'),
            asyncListener(clients[11], 'open')
        ]);
        const clientsList = server.getClients('tagged');
        clientsList[0].addTags(['a', 'b']);
        clientsList[1].addTags(['a', 'c']);
        clientsList[2].addTags(['a', 'b', 'd']);
        clientsList[3].addTags(['a', 'f']);
        clientsList[4].addTags(['a', 'e']);
        const elements = server.getClients('tagged', ['b', 'c']);
        await server.broadcast('msg1', null, 'b');
        await server.broadcast('msg3', 'tagged', ['c', 'f']);
        await server.broadcast('msg2', null, ['d', 'e']);
        const messages = await Promise.all([
            asyncListener(clients[7], 'message'),
            asyncListener(clients[8], 'message'),
            asyncListener(clients[9], 'message'),
            asyncListener(clients[10], 'message'),
            asyncListener(clients[11], 'message')
        ]);
        const result = elements.length === 3 && messages[0] === 'msg1' && messages[1] === 'msg3' && messages[2] === 'msg1' && messages[3] === 'msg3' && messages[4] === 'msg2';
        assert.deepEqual(result, true);
    });

    it('Broadcast a message to all the connected clients.', async () => {
        clients[27] = new WebSocket('ws://127.0.0.1:11224/ch-1');
        clients[28] = new WebSocket('ws://127.0.0.1:11224/ch-2');
        clients[29] = new WebSocket('ws://127.0.0.1:11224/ch-3');
        await Promise.all([
            asyncListener(clients[27], 'open'),
            asyncListener(clients[28], 'open'),
            asyncListener(clients[29], 'open')
        ]);
        await server.broadcast('broadcast-msg');
        const messages = await Promise.all([
            asyncListener(clients[27], 'message'),
            asyncListener(clients[28], 'message'),
            asyncListener(clients[29], 'message')
        ]);
        const result = messages[0] === 'broadcast-msg' && messages[1] === 'broadcast-msg' && messages[2] === 'broadcast-msg';
        assert.deepEqual(result, true);
    });

    it('Kick a client out of the server.', async () => {
        const client = new WebSocket('ws://127.0.0.1:11224/tmp');
        await asyncListener(client, 'open');
        const clientID = server.getClients('tmp')[0].id;
        let kicked = false;
        if ( typeof clientID !== 'undefined' ){
            await server.kickByID(clientID);
            await asyncListener(client, 'close');
            kicked = true;
        }
        assert.deepEqual(kicked, true);
    });

    it('Pushing a message into the message queue based on some properties.', () => {
        messageQueue.push({
            a: 1,
            b: 2
        }, 'Some message');
    });

    it('Retrieving some messages from the message queue based on some properties.', () => {
        messageQueue.push({
            b: 3,
            c: 3
        }, 'Some message 1');
        messageQueue.push({
            x: 3,
            z: 3
        }, 'Some message 2');
        messageQueue.push({
            b: 3,
            d: 2
        }, 'Some message 3');
        const messages = messageQueue.getAll({
            b: 3,
            c: 3,
            d: 2,
            h: 3
        });
        const result = messages.length === 2 && messages[0].message === 'Some message 1' && messages[1].message === 'Some message 3';
        assert.deepEqual(result, true);
    });

    it('Assign a custom property to some clients and send a message to them.', async () => {
        clients[12] = new WebSocket('ws://127.0.0.1:11224/tmp-2');
        clients[13] = new WebSocket('ws://127.0.0.1:11224/tmp-2');
        clients[14] = new WebSocket('ws://127.0.0.1:11224/tmp-2');
        await Promise.all([
            asyncListener(clients[12], 'open'),
            asyncListener(clients[13], 'open'),
            asyncListener(clients[14], 'open')
        ]);
        const clientsList = server.getClients('tmp-2');
        clientsList[0].setAttribute('foo', 'bar1');
        clientsList[1].setAttribute('foo', 'bar2');
        clientsList[2].setAttribute('foo', 'bar1');
        await server.broadcastByProperties('msg', {
            foo: 'bar1'
        });
        const messages = await Promise.all([
            asyncListener(clients[12], 'message'),
            asyncListener(clients[14], 'message')
        ]);
        const result = messages[0] === 'msg' && messages[1] === 'msg';
        assert.deepEqual(result, true);
    });

    it('Send a message to clients having a custom property even if no matching client is connected yet (queue message).', async () => {
        clients[15] = new WebSocket('ws://127.0.0.1:11224/tmp-3');
        await asyncListener(clients[15], 'open');
        await server.broadcastByProperties('msg', {
            test: 'value'
        }, null, null, true);
        const clientsList = server.getClients('tmp-3');
        clientsList[0].setAttribute('test', 'value');
        const message = await asyncListener(clients[15], 'message');
        assert.deepEqual(message, 'msg');
    });

    it('Send a message to a single client.', async () => {
        clients[17] = new WebSocket('ws://127.0.0.1:11224/tmp-4');
        await asyncListener(clients[17], 'open');
        const client = server.getClients('tmp-4')[0];
        await client.send('msg');
        const message = await asyncListener(clients[17], 'message');
        assert.deepEqual(message, 'msg');
    });

    it('Send a serialized message to some client.',  async () => {
        const data = {
            a: 5,
            b: [1, 2, 3]
        };
        clients[18] = new WebSocket('ws://127.0.0.1:11224/tmp-5');
        await asyncListener(clients[18], 'open');
        const client = server.getClients('tmp-5')[0];
        await server.whisper(client.id, data);
        const message = await asyncListener(clients[18], 'message');
        assert.deepEqual(message, JSON.stringify(data));
    });

    it('Reply to all the clients connected to the same channel of a message sender.', async () => {
        clients[19] = new WebSocket('ws://127.0.0.1:11224/tmp-6');
        clients[20] = new WebSocket('ws://127.0.0.1:11224/tmp-6');
        await Promise.all([
            asyncListener(clients[19], 'open'),
            asyncListener(clients[20], 'open')
        ]);
        const clientsList = server.getClients('tmp-6');
        clientsList[0].addTag('sender');
        clientsList[1].addTag('recipient');
        server.setMessageController((message) => {
            message.replyToChannel('OK');
        });
        clients[19].send('msg');
        const message = await asyncListener(clients[20], 'message');
        server.setMessageController(null);
        assert.deepEqual(message, 'OK');
    });

    it('Deny connection based on some channel name.', async () => {
        const errors = [];
        server.getWSConnectionExceptionProcessorFactory().setHandler((exception) => {
            errors.push(exception);
            return '';
        });
        const processor =  server.getWSConnectionProcessorFactory();
        processor.addChannel('the-only-allowed-channel');
        try{
            clients[21] = new WebSocket('ws://127.0.0.1:11224/the-only-allowed-channel');
            clients[22] = new WebSocket('ws://127.0.0.1:11224/another-channel');
            await Promise.all([
                asyncListener(clients[21], 'open'),
                asyncListener(clients[22], 'error')
            ]);
        }catch{}
        processor.dropChannels();
        const result = errors.length === 1 && errors[0] instanceof lala.NotFoundHTTPException;
        assert.deepEqual(result, true);
    });

    it('Trigger a middleware function during client connection.', (done) => {
        const processor = server.getWSConnectionProcessorFactory();
        processor.addMiddleware('test', async (request, socket, next) => {
            processor.dropMiddlewares();
            done();
            await next();
        });
        clients[23] = new WebSocket('ws://127.0.0.1:11224/tmp-7');
    });

    it('Disconnect a client using a middleware.', async () => {
        clients[24] = new WebSocket('ws://127.0.0.1:11224/tmp-7');
        const processor = server.getWSConnectionProcessorFactory();
        processor.dropMiddlewares().addMiddleware('test', async (request, socket, next) => {});
        const error = await asyncListener(clients[24], 'error');
        processor.dropMiddlewares();
        assert.deepEqual(error.code, 'ECONNRESET');
    });

    it('Trigger a middleware function on client message.', (done) => {
        const processor = server.getWSMessageProcessorFactory();
        processor.dropMiddlewares().addMiddleware('test', async (message, next) => {
            processor.dropMiddlewares();
            assert.deepEqual(message.getMessage(), 'msg');
            done();
            await next();
        });
        clients[25] = new WebSocket('ws://127.0.0.1:11224/tmp-8');
        asyncListener(clients[25], 'open').then(() => {
            clients[25].send('msg');
        });
    });

    it('Reject a message using middleware.', (done) => {
        const processor = server.getWSMessageProcessorFactory();
        processor.dropMiddlewares().addMiddleware('test', (message, next) => {});
        server.getWSMessageExceptionProcessorFactory().setHandler((exception) => {
            assert.deepEqual(exception.constructor.name, 'MessageRejectedWebSocketException');
            done();
        });
        clients[26] = new WebSocket('ws://127.0.0.1:11224/tmp-8');
        asyncListener(clients[26], 'open').then(() => {
            clients[26].send('msg');
        });
    });

    it('Close the server.', async () => {
        await server.stop();
        const client = new WebSocket('ws://127.0.0.1:11224');
        const error = await asyncListener(client, 'error');
        assert.deepEqual(error.code, 'ECONNREFUSED');
    });
});
