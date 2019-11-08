'use strict';

// Including third part modules.
const WebSocket = require('ws');

// Including Lala's modules.
const HTTPServer = require('./HTTPServer');
const { ConnectionsIndex, MessageQueue } = require('./support');
const {
    WSConnectionProcessorFactory,
    WSAuthorizationProcessorFactory,
    WSMessageProcessorFactory,
    WSOutputProcessorFactory,
    WSConnectionExceptionProcessorFactory,
    WSMessageExceptionProcessorFactory
} = require('./processors/factories/WS');
const {
    InvalidArgumentException,
    RuntimeException,
    MisconfigurationException,
    BadMethodCallException,
    NotFoundException,
    BadRequestHTTPException
} = require('../Exceptions');
const { isEmptyObject } = require('../helpers');

/**
 * @typedef {Object} WSMessageOptions A standalone documentation for the message options accepted by the "send" method provided by the "ws" module.
 *
 * @property {boolean} compress Specifies whether or not to compress the message content.
 * @property {boolean} binary Specifies whether the message is binary or text.
 * @property {boolean} fin Specifies whether the fragment is the last one.
 * @property {boolean} mask Specifies whether or not to mask the message.
 */

/**
 * This class allows to create a server using the WebSocket protocol.
 */
class WSServer extends HTTPServer {
    /**
     * Generates the object to use as a filter in client selection.
     *
     * @param {?Object.<string, *>} properties An object containing the custom properties that should be included to the generated object.
     * @param {?string} [channel] A string containing the name of the channel clients must be assigned to.
     * @param {?string[]} [tags] An array containing the tags clients should be tagged by.
     *
     * @returns {?Object.<string, *>} The generated filtering object.
     *
     * @throws {InvalidArgumentException} If an invalid properties object is given.
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     * @throws {InvalidArgumentException} If an invalid array of tags is given.
     *
     * @protected
     */
    static _buildClientSelectionFilteringObject(properties, channel, tags){
        if ( typeof properties !== 'object' ){
            throw new InvalidArgumentException('Invalid properties.', 1);
        }
        if ( channel !== null && ( channel === '' || typeof channel !== 'string' ) ){
            throw new InvalidArgumentException('Invalid channel name.', 2);
        }
        if ( tags !== null && ( tags === '' || typeof tags !== 'string' ) && !Array.isArray(tags) ){
            throw new InvalidArgumentException('Invalid tags.', 3);
        }
        let additions = null;
        // Preparing the filtering object.
        if ( channel !== null ){
            additions = tags === null ? {
                channel: channel
            } : {
                channel: channel,
                tags: tags
            };
        }else if( tags !== null ){
            additions = {
                tags: tags
            };
        }
        // Merge custom properties with generated ones.
        return properties === null ? additions : Object.assign(properties, additions);
    }

    /**
     * Generates a new WebSocket server using the third part module "ws".
     *
     * @see https://www.npmjs.com/package/ws
     *
     * @protected
     */
    _buildWSServer(){
        if ( this._server !== null ){
            // Generate the WebSocket server based on the HTTP that has been instantiated.
            this._WSServer = new WebSocket.Server(Object.assign(this._WSOptions, {
                noServer: true
            }));
            // Bind event handlers.
            this._server.on('upgrade', async (request, socket, head) => {
                try{
                    // Set references to this server and internal supporting servers.
                    request.HTTPServer = this._server;
                    request.WSServer = this._WSServer;
                    request.server = this;
                    await this._handleUpgrade(request, socket, head);
                }catch(ex){
                    // Process the exception according to handler functions defined.
                    await this._processWSConnectionException(ex, request, socket);
                }
            });
        }
    }

    /**
     * Processes a whole HTTP client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @override
     * @protected
     */
    async _handleRequest(request, response){
        if ( this._allowHTTPConnections === true ){
            // HTTP requests are allowed, process them using the handle method inherited by the HTTPServer class.
            await super._handleRequest(request, response);
        }else{
            // HTTP requests are not allowed, generate an exception to inform the client.
            const exception = new BadRequestHTTPException('HTTP protocol is not supporter, please switch to WS.', 1);
            // Handle the generated exception.
            await this._processException(exception, request, response);
        }
    }

    /**
     * Handles the upgrade phase upgrading the connection from the HTTP protocol to WebSocket.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
     * @param {Buffer} head The first packet of the upgraded stream.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _handleUpgrade(request, socket, head){
        // Process and complete client connection upgrade.
        const processor = this._WSConnectionProcessorFactory.craft();
        const connection = await processor.process(request, socket, head);
        if ( connection !== null ){
            // Process the connection created, otherwise the connection should be closed as the client is not allowed to connect this server.
            await this._processConnection(connection);
        }
    }

    /**
     * Handles exceptions thrown during connection upgrade phase.
     *
     * @param {Error} exception An instance of the class "Error" representing the exception that has been thrown.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:net.Socket} socket An instance of the native class "Socket" representing the connection that is asking for the protocol upgrade.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _processWSConnectionException(exception, request, socket){
        try{
            this.emit('connectionException', exception, request, socket);
            // Process the exception occurred.
            const processor = this._WSConnectionExceptionProcessorFactory.craft();
            await processor.process(exception, request, socket);
        }catch(ex){
            // TODO: Add support for Logger.
            console.log(ex);
            //TODO
            socket.writeHead(500, 'Internal Server Error');
            socket.write('Internal Server Error.');
            socket.end();
        }
    }

    /**
     * Indexes the given connection based on its channel and ID, the append to its object all the required helpers and event handlers.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _processConnection(connection){
        // Check if this client is allowed to connect this server.
        const processor = this._WSAuthorizationProcessorFactory.craft();
        await processor.process(connection);
        // Index current connection into the index of all the clients connected to this WebSocket server.
        this._WSConnectionsIndex.index(connection, null, 'indexedProperties');
        // Bind required event handlers.
        this._bindConnectionEvents(connection);
        // Add helper function used to handle this connection.
        this._addConnectionHelpers(connection);
        this.emit('connection', connection);
    }

    /**
     * Binds the event handlers used to manage connection states.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @async
     * @protected
     */
    _bindConnectionEvents(connection){
        connection.on('message', async (message) => {
            try{
                await this._handleMessage(message, connection);
            }catch(ex){
                // Process the exception according to handler functions defined.
                await this._processWSMessageException(ex, message, connection);
            }
        });
        connection.on('close', () => {
            this._WSConnectionsIndex.remove(connection);
        });
        connection.on('error', (error) => {
            //TODO: Add support for logger.
            console.log(error);
        });
    }

    /**
     * Add some connection management methods to the given connection object.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @protected
     */
    _addConnectionHelpers(connection){
        // TODO: refactor this method by adding support for the "HelpersInjector" class.
        // Save a copy of the original send function.
        connection.rawSend = connection.send.bind(connection);
        connection.addTag = (tag) => {
            connection.indexedProperties.tags.add(tag);
            this._WSConnectionsIndex.index(connection, null, 'indexedProperties');
            return connection;
        };
        connection.addTags = (tags) => {
            const length = tags.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( tags[i] !== '' && typeof tags[i] === 'string' ){
                    connection.indexedProperties.tags.add(tags[i]);
                }
            }
            this._WSConnectionsIndex.index(connection, null, 'indexedProperties');
            return connection;
        };
        connection.removeTag = (tag) => {
            connection.indexedProperties.tags.delete(tag);
            this._WSConnectionsIndex.index(connection, null, 'indexedProperties');
            return connection;
        };
        connection.removeTags = (tags) => {
            const length = tags.length;
            for ( let i = 0 ; i < length ; i++ ){
                connection.indexedProperties.tags.delete(tags[i]);
            }
            this._WSConnectionsIndex.index(connection, null, 'indexedProperties');
            return connection;
        };
        connection.setAttribute = (name, value, index = true) => {
            const stack = index === true ? connection.indexedProperties : connection.properties;
            stack[name] = value;
            this._sendQueuedMessages(connection);
            if ( index === true ){
                this._WSConnectionsIndex.index(connection, null, 'indexedProperties');
            }
            return connection;
        };
        connection.send = async (message, options) => {
            try{
                const processor = this._WSOutputProcessorFactory.craft();
                await processor.process(message, connection, options);
                return connection;
            }catch(ex){
                console.log(ex);
            }
        };
    }

    /**
     * Handles exceptions thrown during client message processing.
     *
     * @param {Error} exception An instance of the class "Error" representing the exception that has been thrown.
     * @param {*} message The message that was going to be sent.
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _processWSMessageException(exception, message, connection){
        this.emit('messageException', exception, message, connection);
        // Process the exception occurred.
        const processor = this._WSMessageExceptionProcessorFactory.craft();
        await processor.process(exception, message, connection);
    }

    /**
     * Sends all the messages that have been queued.
     *
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @protected
     */
    _sendQueuedMessages(connection){
        if ( connection.hasOwnProperty('indexedProperties') && !isEmptyObject(connection.indexedProperties) ){
            // If at least one indexed property is found, send all the messages that has been queue according to these properties.
            this._messageQueue.send(connection, connection.indexedProperties).then(() => {
                this.emit('messageQueuePushed', connection);
            });
        }
        if ( connection.hasOwnProperty('properties') && !isEmptyObject(connection.properties) ){
            // If at least one standard property has been defined, then send all the messages that have been queued for these properties.
            this._messageQueue.send(connection, connection.properties).then(() => {
                this.emit('messageQueuePushed', connection);
            });
        }
    }

    /**
     * Handles client messages.
     *
     * @param {string} content A string containing the client message.
     * @param {WebSocket} connection An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _handleMessage(content, connection){
        const processor = this._WSMessageProcessorFactory.craft();
        await processor.process(content, connection);
    }

    /**
     * The class constructor.
     *
     * @param {?number} [port] An integer number greater than zero and lower or equal than 65535 representing the port where the server will be listen at, if not defined, 80 will be used as default port.
     */
    constructor(port = null){
        super(port);

        /**
         * @type {WebSocket.Server} [_WSServer] An instance of the class "Server" from the "ws" module representing the WebSocket server generated.
         *
         * @protected
         */
        this._WSServer = null;

        /**
         * @type {Object.<string, *>} _WSOptions Some custom options to pass to the WebSocket server.
         *
         * @protected
         */
        this._WSOptions = {};

        /**
         * @type {ConnectionsIndex} _WSConnectionsIndex An instance of the class "ConnectionsIndex" representing the object that stores the connections to this server and index them according to some properties.
         *
         * @protected
         */
        this._WSConnectionsIndex = new ConnectionsIndex();

        /**
         * @type {MessageQueue} _messageQueue An instance of the class "MessageQueue" representing the list of all the queued messages that should be sent once a client matching some given requirements gets connected.
         *
         * @protected
         */
        this._messageQueue = new MessageQueue();

        /**
         * @type {WSConnectionProcessorFactory} _WSConnectionProcessorFactory An instance of the class "WSConnectionProcessorFactory" used to configure and then generate instance of the class "WSConnectionProcessor".
         *
         * @protected
         */
        this._WSConnectionProcessorFactory = new WSConnectionProcessorFactory();

        /**
         * @type {WSAuthorizationProcessorFactory} _WSAuthorizationProcessorFactory An instance of the class "WSAuthorizationProcessorFactory" used to configure and then generate instance of the class "WSAuthorizationProcessor".
         *
         * @protected
         */
        this._WSAuthorizationProcessorFactory = new WSAuthorizationProcessorFactory();

        /**
         * @type {WSMessageProcessorFactory} _WSMessageProcessorFactory An instance of the class "WSMessageProcessorFactory" used to configure and then generate instance of the class "WSMessageProcessor".
         *
         * @protected
         */
        this._WSMessageProcessorFactory = new WSMessageProcessorFactory();

        /**
         * @type {WSOutputProcessorFactory} _WSOutputProcessorFactory An instance of the class "WSOutputProcessorFactory" used to configure and then generate instance of the class "WSOutputProcessor".
         *
         * @protected
         */
        this._WSOutputProcessorFactory = new WSOutputProcessorFactory();

        /**
         * @type {WSMessageExceptionProcessorFactory} _WSMessageExceptionProcessorFactory An instance of the class "WSMessageExceptionProcessorFactory" used to configure and then generate instance of the class "WSMessageExceptionProcessor".
         *
         * @protected
         */
        this._WSMessageExceptionProcessorFactory = new WSMessageExceptionProcessorFactory();

        /**
         * @type {WSConnectionExceptionProcessorFactory} _WSConnectionExceptionProcessorFactory An instance of the class "WSConnectionExceptionProcessorFactory" used to configure and then generate instance of the class "WSConnectionExceptionProcessor".
         *
         * @protected
         */
        this._WSConnectionExceptionProcessorFactory = new WSConnectionExceptionProcessorFactory();

        /**
         * @type {boolean} [_allowHTTPConnections=false] Defines if this server can handle also HTTP requests or WebSocket clients only.
         *
         * @protected
         */
        this._allowHTTPConnections = false;
    }

    /**
     * Sets some custom options that will be considered during WebSocket server building, this method is chainable.
     *
     * @param {?Object.<string, *>} options Some custom options to pass to the WebSocket server.
     *
     * @returns {WSServer}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setWSOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.');
        }
        this._WSOptions = options === null ? {} : options;
        return this;
    }

    /**
     * Returns all the custom options that have been defined and that will be considered during WebSocket server building.
     *
     * @returns {Object<string, *>} An object containing the custom options defined.
     */
    getWSOptions(){
        return this._WSOptions;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "WSConnectionProcessor" class, this method is chainable.
     *
     * @param {WSConnectionProcessorFactory} factory An instance of the class "WSConnectionProcessorFactory" representing the factory class to use.
     *
     * @returns {WSServer}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setWSConnectionProcessorFactory(factory){
        if ( !this._validateProcessorClass('WSConnection', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._WSConnectionProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "WSConnectionProcessor" class.
     *
     * @returns {WSConnectionProcessorFactory} An instance of the class "WSConnectionProcessorFactory" representing the factory class in use.
     */
    getWSConnectionProcessorFactory(){
        return this._WSConnectionProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "WSAuthorizationProcessor" class, this method is chainable.
     *
     * @param {WSAuthorizationProcessorFactory} factory An instance of the class "WSAuthorizationProcessorFactory" representing the factory class to use.
     *
     * @returns {WSServer}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setWSAuthorizationProcessorFactory(factory){
        if ( !this._validateProcessorClass('WSAuthorization', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._WSAuthorizationProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "WSAuthorizationProcessor" class.
     *
     * @returns {WSAuthorizationProcessorFactory} An instance of the class "WSAuthorizationProcessorFactory" representing the factory class in use.
     */
    getWSAuthorizationProcessorFactory(){
        return this._WSAuthorizationProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "WSMessageProcessor" class, this method is chainable.
     *
     * @param {WSMessageProcessorFactory} factory An instance of the class "WSMessageProcessorFactory" representing the factory class to use.
     *
     * @returns {WSServer}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setWSMessageProcessorFactory(factory){
        if ( !this._validateProcessorClass('WSConnection', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._WSMessageProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "WSMessageProcessor" class.
     *
     * @returns {WSMessageProcessorFactory} An instance of the class "WSMessageProcessorFactory" representing the factory class in use.
     */
    getWSMessageProcessorFactory(){
        return this._WSMessageProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "WSOutputProcessor" class, this method is chainable.
     *
     * @param {WSOutputProcessorFactory} factory An instance of the class "WSOutputProcessorFactory" representing the factory class to use.
     *
     * @returns {WSServer}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setWSOutputProcessorFactory(factory){
        if ( !this._validateProcessorClass('WSOutput', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._WSOutputProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "WSOutputProcessorFactory" class.
     *
     * @returns {WSOutputProcessorFactory} An instance of the class "WSOutputProcessorFactory" representing the factory class in use.
     */
    getWSOutputProcessorFactory(){
        return this._WSOutputProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "WSConnectionExceptionProcessor" class, this method is chainable.
     *
     * @param {WSConnectionExceptionProcessorFactory} factory An instance of the class "WSConnectionExceptionProcessorFactory" representing the factory class in use.
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setWSConnectionExceptionProcessorFactory(factory){
        if ( !this._validateProcessorClass('WSConnectionException', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._WSConnectionExceptionProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "WSConnectionExceptionProcessor" class.
     *
     * @returns {WSConnectionExceptionProcessorFactory} An instance of the class "WSConnectionExceptionProcessorFactory" representing the factory class.
     */
    getWSConnectionExceptionProcessorFactory(){
        return this._WSConnectionExceptionProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "WSMessageExceptionProcessor" class, this method is chainable.
     *
     * @param {WSMessageExceptionProcessorFactory} factory An instance of the class "WSMessageExceptionProcessorFactory" representing the factory class to use.
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setWSMessageExceptionProcessorFactory(factory){
        if ( !this._validateProcessorClass('WSMessageException', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._WSMessageExceptionProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "WSMessageExceptionProcessor" class.
     *
     * @returns {WSMessageExceptionProcessorFactory} An instance of the class "WSMessageExceptionProcessorFactory" representing the factory class.
     */
    getWSMessageExceptionProcessorFactory(){
        return this._WSMessageExceptionProcessorFactory;
    }

    /**
     * Sets the function that will be used to handle client messages, this method is chainable.
     *
     * @param {?WSMessageControllerCallback} controller The callback function to invoke whenever a message is received.
     * @param {?string} [channel] A string containing the name of the channel messages should be sent to in order to trigger the given callback, if set to null it will be used as the default one.
     *
     * @returns {WSServer}
     *
     * @throws {InvalidArgumentException} If an invalid function is given.
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    setMessageController(controller, channel = null){
        this._WSMessageProcessorFactory.setController(controller, channel);
        return this;
    }

    /**
     * Returns the function that will be used to handle client messages.
     *
     * @param {?string} [channel] A string containing the name of the channel the callback function has been assigned to, if null the callback defined as the default will be returned.
     *
     * @returns {?WSMessageControllerCallback} The callback function that has been defined or null if no callback function has been defined so far.
     */
    getMessageController(channel = null){
        return this._WSMessageProcessorFactory.getController();
    }

    /**
     * Sets if HTTP requests can be handled as well as WebSocket ones, this method is chainable.
     *
     * @param {boolean} allowHTTPConnections If set to "true" HTTP requests will be accepted as well.
     *
     * @returns {WSServer}
     */
    setAllowHTTPConnections(allowHTTPConnections){
        this._allowHTTPConnections = allowHTTPConnections === true;
        return this;
    }

    /**
     * Returns if HTTP requests can be handled as well as WebSocket ones.
     *
     * @returns {boolean} If HTTP requests can be handled will be returned "true".
     */
    getAllowHTTPConnections(){
        return this._allowHTTPConnections === true;
    }

    /**
     * Returns the object where queued messages are stored in.
     *
     * @returns {MessageQueue} An instance of the class "MessageQueue" representing the queue where pending messages are stored in.
     */
    getMessageQueue(){
        return this._messageQueue;
    }

    /**
     * Returns the classes used in processor validation.
     *
     * @returns {Object.<string, function>} An object having as key the processor identifier and as value the processor class.
     */
    getProcessorClasses(){
        return Object.assign(super.getProcessorClasses(), {
            WSConnection: WSConnectionProcessorFactory,
            WSAuthorization: WSAuthorizationProcessorFactory,
            WSMessage: WSMessageProcessorFactory,
            WSOutput: WSOutputProcessorFactory,
            WSConnectionException: WSConnectionExceptionProcessorFactory,
            WSMessageException: WSMessageExceptionProcessorFactory
        });
    }

    /**
     * Sends a direct message to a given client.
     *
     * @param {string} clientID A string containing the client ID, an UUID version 4 string representation.
     * @param {*} message The message to send.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider during data sending.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid client ID is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     * @throws {NotFoundException} If no client matching given ID is found.
     * @throws {BadMethodCallException} If given client is not ready to receive messages.
     *
     * @async
     */
     whisper(clientID, message, options = null){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 2);
        }
        // Get the client according to its ID.
        const client = this.getClientByID(clientID);
        if ( client === null ){
            throw new NotFoundException('No client matching given ID found.', 3);
        }
        if ( client.readyState !== WebSocket.OPEN ){
            // Ensure this connection to be opened and ready to receive the message.
            throw new BadMethodCallException('Connection not open.', 4);
        }
        return client.send(message, options);
    }

    /**
     * Sends a given message to clients according to given filtering settings.
     *
     * @param {*} message The message to send.
     * @param {?string} [channel] A string containing the name of the channel clients are connected to, if set to null, channel filtering wont be applied.
     * @param {?(string|string[])} [tags] A string containing the tag the message should be sent to the clients tagged with, multiple tags can be set as an array.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider during data sending.
     * @param {boolean} [queue=false] If set to "true" and no client matching the given channel/tag is found, this message will be queued and send once a client matching those filters connects.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     * @throws {InvalidArgumentException} If an invalid tag or array of tags is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     *
     * @async
     */
     async broadcast(message, channel = null, tags = null, options = null, queue = false){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 3);
        }
        // Get all clients according to defined filters.
        const clients = this.getClientsGenerator(channel, tags);
        const operations = [];
        for ( const client of clients ){
            if ( client.readyState === WebSocket.OPEN ){
                // Send the message only to open ones.
                operations.push(client.send(message, options));
            }
        }
        if ( queue === true && operations.length === 0 ){
            // If no eligible client has been found, then push this message to the message queue in order to send it to the first client that matches these requirements.
            const filteringProperties = WSServer._buildClientSelectionFilteringObject(null, channel, tags);
            this._messageQueue.push(filteringProperties, message, options);
        }else{
            await Promise.all(operations);
        }
    }

    /**
     * Sends a given message to all the clients containing one or more given properties.
     *
     * @param {*} message The message to send.
     * @param {Object.<string, *>} properties An object containing the properties clients should contain as key/value pairs.
     * @param {?string} [channel] A string containing the name of the channel clients are connected to, if set to null, channel filtering wont be applied.
     * @param {?WSMessageOptions} [options] An object containing some additional options to consider during data sending.
     * @param {boolean} [queue=false] If set to "true" and if no client matching the given parameters is found, then message will be stored and sent once a client matching those requirements connects.
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     * @throws {InvalidArgumentException} If an invalid tag or array of tags is given.
     * @throws {InvalidArgumentException} If an invalid options object is given.
     */
    async broadcastByProperties(message, properties, channel = null, options = null, queue = false){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 3);
        }
        // Get all clients according to defined filters.
        const clients = this.getClientsGeneratorByProperties(properties, channel);
        const operations = [];
        // Send the message to all the clients found.
        for ( const client of clients ){
            if ( client.readyState === WebSocket.OPEN ){
                operations.push(client.send(message, options));
            }
        }
        if ( queue === true && operations.length === 0 ){
            // If no client is found and the "queue" option is enabled, then store the message in the queue and send it to the first client matching the given properties connected.
            const filteringProperties = WSServer._buildClientSelectionFilteringObject(properties, channel, null);
            this._messageQueue.push(filteringProperties, message, options);
        }else{
            await Promise.all(operations);
        }
    }

    /**
     * Disconnects a client according to the given ID.
     *
     * @param {string} clientID A string containing the client ID, a UUID version 4 string representation.
     * @param {?string} [message] The message to send to the client as a reason for its disconnection.
     * @param {?number} [code] An integer number used to inform the client about disconnection and to provide some information regarding the reason.
     * @param {boolean} [force=false] If set to "true" client connection will be instantly terminated and no message will be sent (including this message and code).
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid client ID is given.
     * @throws {InvalidArgumentException} If an invalid message is given.
     * @throws {InvalidArgumentException} If an invalid status code is given.
     *
     * @async
     */
    async kickByID(clientID, message = null, code = null, force = false){
        if ( message !== null && ( message === '' || typeof message !== 'string' ) ){
            throw new InvalidArgumentException('Invalid message.', 2);
        }
        if ( isNaN(code) ){
            throw new InvalidArgumentException('Invalid code.', 3);
        }
        // Get the client according to the given ID.
        const client = this.getClientByID(clientID);
        if ( client === null ){
            throw new NotFoundException('No client matching given ID found.', 2);
        }
        if ( force === true ){
            // Force client disconnection.
            client.terminate();
        }else{
            client.close(( code === null ? 1000 : code ), ( message === null ? '' : message ));
        }
    }

    /**
     * Returns a client according to the given unique ID.
     *
     * @param {string} id A string containing the client unique ID, a string representation of an UUID version 4.
     *
     * @returns {?WebSocket} An instance of the class "WebSocket" provided by the "ws" module and representing the client connection.
     *
     * @throws {InvalidArgumentException} If an invalid client ID is given.
     */
    getClientByID(id){
        if ( id === '' || typeof id !== 'string' ){
            throw new InvalidArgumentException('Invalid client ID.', 1);
        }
        return this._WSConnectionsIndex.getConnectionByID(id);
    }

    /**
     * Returns all the connected clients according to some given filtering criteria.
     *
     * @param {?string} [channel] A string containing the channel clients must be connected to, if null no channel filtering will be applied.
     * @param {?(string|string[])} [tags] A string containing the tag that must be associated to clients in order to be considered, an array can be used as well, if null no tag filtering will be applied.
     *
     * @returns {IterableIterator<WebSocket>} An iterator that yields clients found.
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     * @throws {InvalidArgumentException} If an invalid tag or array of tags is given.
     */
    getClientsGenerator(channel = null, tags = null){
        // Generate the object that contains all the properties clients must be filtered by.
        const filteringProperties = WSServer._buildClientSelectionFilteringObject(null, channel, tags);
        // Pick clients matching filtering object built.
        return this._WSConnectionsIndex.getConnections(filteringProperties);
    }

    /**
     * Returns all the connected clients according to some given filtering criteria as an array.
     *
     * @param {?string} [channel] A string containing the channel clients must be connected to, if null no channel filtering will be applied.
     * @param {?(string|string[])} [tags] A string containing the tag that must be associated to clients in order to be considered, an array can be used as well, if null no tag filtering will be applied.
     *
     * @returns {WebSocket[]} An array containing the clients found.
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     * @throws {InvalidArgumentException} If an invalid tag or array of tags is given.
     */
    getClients(channel = null, tags = null){
        return Array.from(this.getClientsGenerator(channel, tags));
    }

    /**
     * Returns a portion of all the connected clients according to some filtering properties given.
     *
     * @param {Object.<string, *>} properties An object containing some attributes that must have been assigned to clients (as indexed properties).
     * @param {?string} channel The name of the channel clients to return must belong to, if null no filter by channel will be applied.
     * @param {?string[]} tags One or more tags clients must be tagged with, if not defined, no tag filtering will be applied.
     *
     * @returns {IterableIterator<WebSocket>} An iterator that yields clients found.
     *
     * @throws {InvalidArgumentException} If an invalid object containing the filtering properties is given.
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     * @throws {InvalidArgumentException} If an invalid tag or array of tags is given.
     */
    getClientsGeneratorByProperties(properties, channel = null, tags = null){
        if ( properties === null || typeof properties !== 'object' ){
            throw new InvalidArgumentException('Invalid properties.', 1);
        }
        // Generate the object that contains all the properties clients must be filtered by.
        const filteringProperties = WSServer._buildClientSelectionFilteringObject(properties, channel, tags);
        // Pick clients matching filtering object built.
        return this._WSConnectionsIndex.getConnections(filteringProperties);
    }

    /**
     * Starts the server.
     *
     * @param {boolean} [rebuild=false] If set to "true", before starting the server, a new server will be built, useful to refresh server configuration.
     *
     * @returns {Promise<void>}
     *
     * @throws {MisconfigurationException} If no port has been defined.
     * @throws {RuntimeException} If an error occurs when starting the server.
     *
     * @async
     */
    async start(rebuild = false){
        await super.start(rebuild);
        // Generate the WebSocket server based on the HTTP server generated.
        this._buildWSServer();
    }

    /**
     * Stops the server.
     *
     * @returns {Promise<void>}
     *
     * @throws {RuntimeException} If an error occurs when stopping the server.
     *
     * @async
     */
    async stop(){
        if ( this.isRunning() ){
            // Stop the WebSocket server.
            await (new Promise((resolve) => {
                this._WSServer.close();
                resolve();
            }));
            // Stop the native HTTP server used as WebSocket server basement.
            await super.stop();
        }
    }
}

module.exports = WSServer;
