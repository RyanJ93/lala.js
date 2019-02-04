'use strict';

// Including native modules.
const http = require('http');
const https = require('https');
const net = require('net');
const filesystem = require('fs');
const { EventEmitter } = require('events');

// Including dependencies.
const websocket = require('websocket');

// Including Lala's modules.
const Request = require('./Request');
const Config = require('../Config/Config');
const Router = require('../Routing/Router');
const InvalidArgumentException = require('../Exceptions/InvalidArgumentException');
const MisconfigurationException = require('../Exceptions/MisconfigurationException');
const helpers = require('../helpers');

/**
 * @type {object} servers An object containing all the defined servers represented as key/value pairs having as key the server name and as value the instance of this class representing it.
 */
let servers = {};
class Server extends EventEmitter{
    /**
     * Instantiates all the servers defined in the configuration file loaded.
     *
     * @return {Promise<void>}
     *
     * @async
     */
    static async initFromConfig(){
        // Get the configuration block from the loaded configuration.
        let entries = Config.getProperty('servers');
        if ( entries === null || typeof entries !== 'object' ){
            return;
        }
        // Loop through all the defined servers.
        for ( let name in entries ){
            if ( !entries.hasOwnProperty(name) || name === '' || typeof name !== 'string' ){
                continue;
            }
            if ( typeof entries[name].port === 'number' && entries[name].port !== null && entries[name].port > 0 && entries[name].port <= 65535 ){
                // Create a new server having the given name.
                let server = new Server(name);
                let type = entries[name].websocket === true ? 'ws' : 'http';
                server.setPort(Math.floor(entries[name].port));
                if ( entries[name].bind !== '' && typeof entries[name].bind === 'string' ){
                    // Set the address to bind.
                    server.setBind(entries[name].bind);
                }
                if ( entries[name].tls !== null && typeof entries[name].tls === 'object' ){
                    // Setting up parameters for a TLS based server, starting from TLS certificate.
                    if ( entries[name].tls.certificate !== '' && typeof entries[name].tls.certificate === 'string' ){
                        server.setCertificate(entries[name].tls.certificate);
                    }
                    if ( entries[name].tls.certificatePath !== '' && typeof entries[name].tls.certificatePath === 'string' ){
                        await server.setCertificateFile(entries[name].tls.certificatePath);
                    }
                    // Setting up the certificate's RSA private key.
                    if ( entries[name].tls.privateKey !== '' && typeof entries[name].tls.privateKey === 'string' ){
                        server.setPrivateKey(entries[name].tls.privateKey);
                    }
                    if ( entries[name].tls.privateKeyPath !== '' && typeof entries[name].tls.privateKeyPath === 'string' ){
                        await server.setPrivateKeyFile(entries[name].tls.privateKeyPath);
                    }
                    // Setting up the optional pass phrase for the TLS certificate.
                    if ( entries[name].tls.passPhrase !== '' && typeof entries[name].tls.passPhrase === 'string' ){
                        server.setPassPhrase(entries[name].tls.passPhrase);
                    }
                    type = type === 'ws' ? 'wss' : 'https';
                }
                if ( entries[name].path !== '' && typeof entries[name].path === 'string' ){
                    // Set the path where the server will listen at using an UNIX socket file.
                    server.setPath(entries[name].path);
                    type = 'sock';
                }
                server.setType(type);
                if ( Array.isArray(entries[name].routers) ){
                    // Set what router use when handling the requests, if not set, all the available routers will be used.
                    entries[name].routers.forEach((router) => {
                        if ( router !== '' && typeof router === 'string' ){
                            router = Router.getRouter(router);
                            if ( router !== null ){
                                server.addRouter(router);
                            }
                        }
                    });
                }
                // Start the server.
                server.start();
            }
        }
    }

    /**
     * Generates a random port ensuring that the it is available to use.
     *
     * @param {object?} options An object containing the options for the port generation such as min and max value and ports to avoid.
     *
     * @return {number|null} An integer number greater than zero and lower or equal than 65535 representing the port number found, if no port number was found, null will be returned instead.
     */
    static getRandomPort( options){
        if ( options === null || typeof options !== 'object' ){
            // Set the default options if no custom option has been defined.
            options = {
                excluded: [],
                min: 1,
                max: 65535
            };
        }
        if ( !Array.isArray(options.excluded) ){
            options.excluded = [];
        }
        if ( options.min === null || isNaN(options.min) || options.min <= 0 ){
            options.min = 1;
        }
        if ( options.min > 65535 ){
            options.min = 65535;
        }
        if ( options.max === null || isNaN(options.max) || options.max > 65535 ){
            options.max = 65535;
        }
        if ( options.max <= 0 ){
            options.max = 0;
        }
        if ( options.min >= options.max ){
            return options.max;
        }
        let port = null;
        while ( port === null ){
            // Generate the port number taking care of defined range.
            port = Math.floor(( Math.random() * options.max ) - options.min);
            if ( options.excluded.indexOf(port) !== -1 ){
                port = null;
                continue;
            }
            // Probe the port to find out if it is available or not.
            let server = http.createServer();
            server.on('error', (error) => {
                if ( error.code === 'EACCES' ){
                    port = null;
                }
            });
            server.listen(port);
            server.close();
        }
        return port;
    }

    /**
     * The class constructor.
     *
     * @param {string?} name An optional string containing the server name, by default "default" is used.
     */
    constructor(name){
        super();
        if ( name === '' || typeof name !== 'string' ){
            name = 'default';
        }
        if ( typeof servers[name] !== 'undefined' ){
            return servers[name];
        }
        this.name = name;
        this.type = 'http';
        this.bind = null;
        this.path = null;
        this.port = null;
        this.routers = [];
        this.server = null;
        this.originalServer = null;
        this.running = false;
        this.handler = null;
        // TODO: Create setters and getters for these properties.
        this.autoRestart = true;
        this.autoRefresh = false;
        // Properties for TLS based servers.
        this.certificate = null;
        this.certificatePath = null;
        this.privateKey = null;
        this.privateKeyPath = null;
        this.passPhrase = null;
        // Properties for WebSocket based servers.
        this.clients = {};
        this.accessMiddlewares = {};
        this.messageHandler = null;
        servers[name] = this;
    }

    /**
     * Sets the server type, this method is chainable.
     *
     * @param {string} type A string containing the server type, by default "http" is used.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid server type is given.
     */
    setType(type){
        if ( typeof(type) !== 'string' || type === '' ){
            throw new InvalidArgumentException('Invalid type.', 1);
        }
        this.type = type;
        return this;
    }

    /**
     * Returns the server type.
     *
     * @return {string} A string containing the server type.
     */
    getType(){
        return this.type;
    }

    /**
     * Sets the IP address to bind, this method is chainable.
     *
     * @param {string?} bind A string containing the IP address to bind, by default "0.0.0.0" will be used.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid IP address were given.
     */
    setBind(bind){
        let buffer = this.bind;
        if ( bind === null ){
            this.bind = null;
            if ( buffer !== null && this.autoRefresh === true ){
                this.restart();
            }
            return this;
        }
        if ( bind === '' || typeof bind !== 'string' ){
            throw new InvalidArgumentException('Invalid IP address.', 1);
        }
        this.bind = bind;
        // If auto refresh is enabled and the value gets updated the server will be restarted in order to apply the changes, otherwise it needs to be restarted manually.
        if ( buffer !== bind && this.autoRefresh === true ){
            this.restart();
        }
        return this;
    }

    /**
     * Returns the IP address to bind.
     *
     * @return {string} A string containing the IP address to bind.
     */
    getBind(){
        return this.bind === null ? '0.0.0.0' : this.bind;
    }

    /**
     * Sets the path where the server will listen on, note that this parameter takes sense only when running a "sock" server (listening on a UNIX socket file), this method is chainable.
     *
     * @param {string} path A string containing the path to the UNIX socket file.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPath(path){
        if ( path === null ){
            this.path = null;
            return this;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this.path = path;
        return this;
    }

    /**
     * Returns the path where the server will listen on.
     *
     * @return {string|null} A string containing the path to the UNIX socket file, if no path has been defined, null will be returned instead.
     */
    getPath(){
        return this.path;
    }

    /**
     * Sets the port to bind, this method is chainable.
     *
     * @param {number} port An integer number greater than zero and lower or equal than 65535 representing the number of the port to bind.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid port number were given.
     */
    setPort(port){
        if ( port === null || isNaN(port) || port <= 0 || port > 65535 ){
            throw new InvalidArgumentException('Invalid port number.', 1);
        }
        let buffer = this.port;
        this.port = port;
        // If auto refresh is enabled and the value gets updated the server will be restarted in order to apply the changes, otherwise it needs to be restarted manually.
        if ( buffer !== port && this.autoRefresh === true ){
            this.restart();
        }
        return this;
    }

    /**
     * Sets the port to bind, this method is chainable.
     *
     * @return {number} An integer number greater than zero and lower or equal than 65535 representing the port number.
     */
    getPort(){
        return this.port;
    }

    /**
     * Generates and uses a random port, then returns the generated port.
     *
     * @param {object?} options An object containing the additional option to pass to the port generator, such as min and max value and ports to avoid.
     *
     * @return {number} An integer number greater than zero and lower or equal than 65535 representing the generated port.
     */
    useRandomPort(options){
        let port = Server.getRandomPort(options);
        if ( port === null ){
            //TODO: Add exception.
        }
        this.setPort(port);
        return port;
    }

    /**
     * Adds a router to the list of all the routers queried while handling client requests, this method is chainable.
     *
     * @param {Router} router An instance of the class "Router" representing the router to add.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid router were given.
     */
    addRouter(router){
        if ( router === null || typeof router !== 'object' || router.constructor.name !== 'Router' ){
            throw new InvalidArgumentException('Invalid router.', 1);
        }
        let type = router.getType();
        // Router types need to be uniques.
        if ( this.routers.indexOf(type) === -1 ){
            this.routers.push(type);
        }
        return this;
    }

    /**
     * Removes a router from the list of all the routers queried while handling client requests, this method is chainable.
     *
     * @param {Router} router An instance of the class "Router" representing the router to remove.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid router were given.
     */
    removeRouter(router){
        if ( router === null || typeof router !== 'object' || router.constructor.name !== 'Router' ){
            throw new InvalidArgumentException('Invalid router.', 1);
        }
        let type = router.getType();
        let index = this.routers.indexOf(type);
        if ( index !== -1 ){
            this.routers.splice(index, 1);
        }
        return this;
    }

    /**
     * Sets the router that will be queried while handling client requests, this method is chainable.
     *
     * @param {Router[]} routers A sequential array containing all the routers to consider.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid array where given.
     */
    setRouters(routers){
        if ( !Array.isArray(routers) ){
            throw new InvalidArgumentException('Invalid array.', 1);
        }
        this.routers = [];
        if ( routers.length === 0 ){
            return this;
        }
        routers.forEach((router) => {
            if ( router !== null && typeof router === 'object' && router.constructor.name === 'Router' ){
                let type = router.getType();
                // Router types need to be uniques.
                if ( this.routers.indexOf(type) === -1 ){
                    this.routers.push(type);
                }
            }
        });
        return this;
    }

    /**
     * Removes all the routers queried while handling client requests, this method is chainable.
     *
     * @return {Server}
     */
    dropRouters(){
        this.routers = [];
        return this;
    }

    /**
     * Returns all the routers queried while handling client requests, this method is chainable.
     *
     * @return {Router[]} A sequential array containing the routers.
     */
    getRouters(){
        let routers = [];
        this.routers.forEach((router) => {
            // Get the router's instance given its type.
            router = Router.getRouter(router);
            if ( router !== null ){
                routers.push(router);
            }
        });
        return routers;
    }

    /**
     * Sets the certificate used by TLS based servers, this method is chainable.
     *
     * @param {string} certificate A string containing the content of the certificate, pass null to unset previous certificate.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid certificate is given.
     */
    setCertificate(certificate){
        if ( certificate === null ){
            this.certificate = null;
            this.certificatePath = null;
            return this;
        }
        if ( certificate === '' || typeof certificate !== 'string' ){
            throw new InvalidArgumentException('Invalid certificate.', 1);
        }
        this.certificate = certificate;
        this.certificatePath = null;
        return this;
    }

    /**
     * Returns the certificate used by TLS based servers.
     *
     * @return {null} A string containing the content of the certificate, if no certificate has been defined, null will be returned instead.
     */
    getCertificate(){
        return this.certificate;
    }

    /**
     * Sets the path to the certificate file used by TLS based servers.
     *
     * @param {string} path A string containing the path to the certificate file.
     *
     * @return {Promise<Server>}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     *
     * @async
     */
    async setCertificateFile(path){
        if ( path === null ){
            this.certificate = null;
            this.certificatePath = null;
            return this;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid certificate path.', 1);
        }
        await filesystem.readFile(path, async (error, content) => {
            if ( error ){
                //
            }
            this.certificate = content.toString();
            this.certificatePath = path;
        });
    }

    /**
     * Sets the path to the certificate file used by TLS based servers, this is the synchronous variant of the method "setCertificateFile", this method is chainable.
     *
     * @param {string} path A string containing the path to the certificate file.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setCertificateFileSync(path){
        if ( path === null ){
            this.certificate = null;
            this.certificatePath = null;
            return this;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid certificate path.', 1);
        }
        try{
            this.certificate = filesystem.readFileSync(path).toString();
            this.certificatePath = path;
            return this;
        }catch(ex){
            //
        }
    }

    /**
     * Returns the path to the certificate file used by TLS based servers.
     *
     * @return {string} A string containing the path to the certificate file.
     */
    getCertificateFile(){
        return this.certificatePath;
    }

    /**
     * Sets the private key used by TLS based servers, this method is chainable.
     *
     * @param {string} privateKey
     *
     * @return {Server}
     */
    setPrivateKey(privateKey){
        if ( privateKey === null ){
            this.privateKey = null;
            this.privateKeyPath = null;
            return this;
        }
        if ( privateKey === '' || typeof privateKey !== 'string' ){
            throw new InvalidArgumentException('Invalid private key.', 1);
        }
        this.privateKey = privateKey;
        this.privateKeyPath = null;
        return this;
    }

    /**
     * Returns the private key used by TLS based servers.
     *
     * @return {string} A string containing the private key.
     */
    getPrivateKey(){
        return this.privateKey;
    }

    /**
     * Sets the private key used by TLS based servers.
     *
     * @param {string} path A string containing the private key.
     *
     * @return {Promise<Server>}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     *
     * @async
     */
    async setPrivateKeyFile(path){
        if ( path === null ){
            this.privateKey = null;
            this.privateKeyPath = null;
            return this;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid private key path.', 1);
        }
        await filesystem.readFile(path, async (error, content) => {
            if ( error ){
                //
            }
            this.privateKey = content.toString();
            this.privateKeyPath = path;
        });
    }

    /**
     * Sets the path to the private key file used by TLS based servers, this is the synchronous variant of the method "setPrivateKeyFile", this method is chainable.
     *
     * @param {string} path A string containing the private key.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPrivateKeyFileSync(path){
        if ( path === null ){
            this.privateKey = null;
            this.privateKeyPath = null;
            return this;
        }
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid private key path.', 1);
        }
        try{
            this.privateKey = filesystem.readFileSync(path).toString();
            this.privateKeyPath = path;
            return this;
        }catch(ex){
            if ( ex.code === 'ENOENT' ){
                throw new InvalidArgumentException('File not found.', 2);
            }
            console.log(ex);
            //
        }
    }

    /**
     * Returns the path to the private key file used by TLS based servers.
     *
     * @return {string} A string containing the path to the private key file.
     */
    getPrivateKeyFile(){
        return this.privateKeyPath;
    }

    /**
     * Sets an optional pass phrase if required to access to the TLS certificate used by TLS based servers, this method is chainable.
     *
     * @param {string} passPhrase A string containing the pass phrase, if set to null, no pass phrase will be used.
     */
    setPassPhrase(passPhrase){
        if ( passPhrase === null ){
            this.passPhrase = null;
            return this;
        }
        if ( passPhrase === '' || typeof passPhrase !== 'string' ){
            throw new InvalidArgumentException('Invalid pass phrase.', 1);
        }
        this.passPhrase = passPhrase;
        return this;
    }

    /**
     * Returns the pass phrase required to access to the TLS certificate used by TLS based servers.
     *
     * @return {string} A string containing the pass phrase, if no pass phrase is being in use, will be returned null.
     */
    getPassPhrase(){
        return this.passPhrase;
    }

    /**
     * Adds one middleware function invoked whenever a new client establishes a connection with the WebSocket server, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     * @param {function} handler The callback function that handles the middleware.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     * @throws {InvalidArgumentException} If the given handler is not valid.
     */
    addAccessMiddleware(identifier, handler){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler.', 2);
        }
        this.accessMiddlewares[identifier] = handler;
        return this;
    }

    /**
     * Removes one of the middleware function invoked whenever a new client establishes a connection with the WebSocket server, this method is chainable.
     *
     * @param {string} identifier A string containing the middleware identifier.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If the given identifier is not valid.
     */
    removeAccessMiddleware(identifier){
        if ( typeof identifier !== 'string' || identifier === '' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        delete this.accessMiddlewares[identifier];
        return this;
    }

    /**
     * Drops all the defined middleware functions, this method is chainable.
     *
     * @returns {Server}
     */
    dropAccessMiddlewares(){
        this.accessMiddlewares = {};
        return this;
    }

    /**
     * Adds one or more middleware functions invoked whenever a new client establishes a connection with the WebSocket server, this method is chainable.
     *
     * @param {object} middlewares An object having as key the middleware identifier as string and as value its handler function.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid object were given.
     */
    setAccessMiddlewares(middlewares){
        if ( middlewares === null || typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares definitions.', 1);
        }
        for ( let identifier in middlewares ){
            if ( typeof identifier === 'string' && identifier !== '' && typeof middlewares === 'function' ){
                this.accessMiddlewares[identifier] = middlewares[identifier];
            }
        }
        return this;
    }

    /**
     * Returns all the defined middleware functions invoked whenever a new client establishes a connection with the WebSocket server.
     *
     * @returns {object} An object having as key the middleware identifier as string and as value its handler function.
     */
    getAccessMiddlewares(){
        return this.accessMiddlewares;
    }

    /**
     * Sets the function invoked to handle the messages received by the WebSocket server, this method is chainable.
     *
     * @param {function|null} handler A function that will be invoked whenever a new message is received.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid handler function is given.
     */
    setMessageHandler(handler){
        if ( handler === null ){
            this.messageHandler = null;
            return this;
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid handler function.', 1);
        }
        this.messageHandler = handler;
        return this;
    }

    /**
     * Returns the function invoked to handle the messages received by the WebSocket server.
     *
     * @return {function|null} A function or null if no function has been defined.
     */
    getMessageHandler(){
        return this.messageHandler;
    }

    /**
     * Sends a message to a given client through WebSocket, this method is chainable.
     *
     * @param {string} clientID A string containing the client ID, an UUID version 4.
     * @param {*} message The message to send to the client, it will be serialized into a JSON string representation.
     *
     * @return {Server}
     */
    sendMessage(clientID, message){
        if ( clientID === '' || typeof clientID !== 'string' ){
            throw new InvalidArgumentException('Invalid client ID.', 1);
        }
        message = JSON.stringify(message);
        if ( this.clients[clientID] !== null && typeof this.clients[clientID] === 'object' ){
            this.clients[clientID].sendUTF(message);
        }
        return this;
    }

    /**
     * Returns if the server is running or not.
     *
     * @return {boolean} If the server is currently running will be returned "true", otherwise "false".
     */
    isRunning(){
        return this.running === true;
    }

    /**
     * Starts the server, this method is chainable.
     *
     * @param {function?} handler The function that will be invoked whenever a request come to the server, if not specified, the request will be handled by the routers.
     *
     * @return {Server}
     *
     * @throws {MisconfigurationException} If no UNIX socket path has been defined.
     */
    start(handler){
        // If already running throw an exception, if the server needs to be restarted/refresh, use "restart" method instead.
        if ( this.isRunning() ){
            // TODO: Throw exception.
        }
        this.handler = typeof handler === 'function' ? handler : null;
        let restart = this.server !== null;
        // Create the server if it hasn't been created yet.
        if ( !restart ){
            // Generating the server object according to its protocol and/or type.
            switch ( this.type ){
                case 'http':{
                    this._createHTTPServer(false);
                }break;
                case 'https':{
                    this._createHTTPServer(true);
                }break;
                case 'ws':{
                    this._createWebSocketServer(false);
                }break;
                case 'wss':{
                    this._createWebSocketServer(true);
                }break;
                case 'sock':{
                    this._createUNIXSockServer();
                }break;
            }
        }
        // Finally start the server.
        if ( this.type === 'ws' || this.type === 'wss' ){
            this.originalServer.listen(this.port);
        }else if ( this.type === 'sock' ){
            let path = this.getPath();
            if ( path === null ){
                throw new MisconfigurationException('No UNIX socket path has been defined.', 2);
            }
            this.server.listen(path);
        }else{
            this.server.listen(this.port);
        }
        this.running = true;
        if ( restart ){
            this.emit('restart', this);
            return this;
        }
        this.emit('start', this);
        return this;
    }

    /**
     * Creates an HTTP server using the native "http" module.
     *
     * @param {boolean} tls If set to "true" TLS support will be enabled for the created server, otherwise not.
     *
     * @private
     */
    _createHTTPServer(tls){
        let options = {};
        if ( tls === true ){
            if ( tls ){
                // Loading TLS parameters.
                options.cert = this.getCertificate();
                options.key = this.getPrivateKey();
                if ( options.cert === null || options.key === null ){
                    throw new MisconfigurationException('TLS parameters have not been configured.', 1);
                }
                options.passphrase = this.getPassPhrase();
            }
        }
        this.server = ( tls === true ? https : http ).createServer(options, async (request, handler) => {
            // Create the custom request and append the helper functions to the request handler.
            request = await Request.prepareRequest(request, handler);
            Request.prepareHandler(handler);
            this.emit('request', request, handler, this);
            if ( typeof this.handler === 'function' ){
                // Execute the custom request handler, if defined.
                return handler.call(this, request, handler);
            }
            // If no custom handler were defined, use the default one.
            await Server.defaultHandler(request, handler, {
                routers: this.routers
            });
        });
        this.server.on('error', (error) => {
            // TODO: Handle your error here
            console.log(error);
            this.emit('error', error, this);
        });
    }

    /**
     * Creates a WebSocket server by extending an HTTP or HTTPS server using the external module "websocket".
     *
     * @param {boolean} tls If set to "true" TLS support will be enabled for the created server, otherwise not.
     *
     * @throws {MisconfigurationException} If the TLS parameters have not been configured.
     *
     * @private
     */
    _createWebSocketServer(tls){
        let options = {};
        if ( tls === true ){
            if ( tls ){
                // Loading TLS parameters.
                options.cert = this.getCertificate();
                options.key = this.getPrivateKey();
                if ( options.cert === null || options.key === null ){
                    throw new MisconfigurationException('TLS parameters have not been configured.', 1);
                }
                options.passphrase = this.getPassPhrase();
            }
        }
        if ( this.HTTPFallback !== false ){
            this.originalServer = ( tls === true ? https : http ).createServer(options, async (request, handler) => {
                // Create the custom request and append the helper functions to the request handler.
                request = await Request.prepareRequest(request, handler);
                Request.prepareHandler(handler);
                this.emit('request', request, handler, this);
                if ( typeof this.handler === 'function' ){
                    // Execute the custom request handler, if defined.
                    return handler.call(this, request, handler);
                }
                // If no custom handler were defined, use the default one.
                await Server.defaultHandler(request, handler, {
                    routers: this.routers
                });
            });
        }else{
            this.originalServer = ( tls === true ? https : http ).createServer(options);
        }
        this.originalServer.on('error', (error) => {
            // TODO: Handle your error here
            console.log(error);
            this.emit('error', error, this);
        });
        // Instantiate the WebSocket server basing it on the created HTTP server.
        this.server = new websocket.server({
            httpServer: this.originalServer,
            autoAcceptConnections: false
        });
        // Setting up WebSocket's events.
        this.server.on('request', (request, handler) => {
            let clientID = helpers.generateUUID(4, false);
            request.clientID = clientID;
            this.emit('connectionRequest', request, handler, this);
            let middlewares = this.getAccessMiddlewares();
            // Executing access middleware functions.
            for ( let middleware in middlewares ){
                if ( middlewares.hasOwnProperty(middleware) ){
                    middlewares[middleware].call(this, request, handler);
                }
            }
            // As middleware function have agreed, the connection is now accepted.
            this.clients[clientID] = request.accept();
            this.clients[clientID].clientID = clientID;
            this.emit('connect', request, handler, this);
            // Add listener for incoming messages.
            this.clients[clientID].on('message', (message) => {
                this.emit('message', message, clientID, this);
                if ( typeof this.messageHandler === 'function' ){
                    this.messageHandler.call(this, message, clientID);
                }
            });
        });
        this.server.on('close', (connection) => {
            this.emit('disconnect', connection, this);
            if ( this.clients.hasOwnProperty(connection.clientID) ){
                delete this.clients[connection.clientID];
            }
        });
    }

    /**
     * Creates an HTTP server listening on a UNIX socket path using the native module "net".
     *
     * @private
     */
    _createUNIXSockServer(){
        let options = {};
        this.server = net.createServer(options, async (request, handler) => {
            // Create the custom request and append the helper functions to the request handler.
            request = await Request.prepareRequest(request, handler);
            Request.prepareHandler(handler);
            this.emit('request', request, handler, this);
            if ( typeof this.handler === 'function' ){
                // Execute the custom request handler, if defined.
                return handler.call(this, request, handler);
            }
            // If no custom handler were defined, use the default one.
            await Server.defaultHandler(request, handler, {
                routers: this.routers
            });
        });
        this.server.on('error', (error) => {
            // TODO: Handle your error here
            console.log(error);
            this.emit('error', error, this);
        });
    }

    /**
     * Restarts the server, this method is chainable.
     *
     * @return {Server}
     */
    restart(){
        if ( this.isRunning() ){
            // Stop the server, if running.
            this.server.stop();
            this.emit('restarting', this);
        }
        // Start it over again.
        this.start(this.handler);
        return this;
    }

    /**
     * Stops the server, this method is chainable.
     *
     * @return {Server}
     */
    stop(){
        if ( this.isRunning() ){
            if ( this.originalServer !== null ){
                this.originalServer.close();
            }else{
                this.server.close();
            }
            this.emit('stop', this);
        }
        return this;
    }

    /**
     * Returns the Server object, basically the original object created from the "http", the "https" or the "websocket" module.
     *
     * @return {object} An object representing the server currently in use.
     */
    getServerObject(){
        if ( this.server === null ){
            //TODO: Add exception.
        }
        return this.server;
    }

    /**
     *
     *
     * @param request
     * @param handler
     * @param options
     *
     * @return {Promise<void>}
     */
    static async defaultHandler(request, handler, options){
        try{
            await Router.handle(request, handler, options);
        }catch(ex){
            if ( ex.constructor.name === 'NotFoundHttpException' ){
                Request.throwHTTPError(404, handler);
                return;
            }
            throw ex;
        }
    }
}

module.exports = Server;
