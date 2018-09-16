'use strict';

// Including native modules.
const http = require('http');
const https = require('https');

// Including dependencies.
const websocket = require('websocket');

// Including Lala's modules.
const { Request, Config, Router, InvalidArgumentException } = require('../../index');

/**
 * @type {object} servers An object containing all the defined servers represented as key/value pairs having as key the server name and as value the instance of this class representing it.
 */
let servers = {};
class Server{
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
                server.setPort(Math.floor(entries[name].port));
                if ( entries[name].bind !== '' && typeof entries[name].bind === 'string' ){
                    // Set the address to bind.
                    server.setBind(entries[name].bind);
                }
                if ( entries[name].type !== '' && typeof entries[name].type === 'string' ){
                    // Set the server type, by default "http".
                    server.setType(entries[name].type);
                }
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
        if ( name === '' || typeof name !== 'string' ){
            name = 'default';
        }
        if ( typeof servers[name] !== 'undefined' ){
            return servers[name];
        }
        this.name = name;
        this.type = 'http';
        this.bind = null;
        this.port = null;
        this.routers = [];
        this.server = null;
        this.running = false;
        this.handler = null;
        // TODO: Create setters and getters for these properties.
        this.autoRestart = true;
        this.autoRefresh = false;
        servers[name] = this;
    }

    /**
     * Sets the server type, this method is chainable.
     *
     * @param {string} type A string containing the server type, by default "http" is used.
     *
     * @return {Server}
     *
     * @throws InvalidArgumentException If an invalid server type is given.
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
     * @throws InvalidArgumentException If an invalid IP address were given.
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
     * Sets the port to bind, this method is chainable.
     *
     * @param {number} port An integer number greater than zero and lower or equal than 65535 representing the number of the port to bind.
     *
     * @return {Server}
     *
     * @throws InvalidArgumentException If an invalid port number were given.
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
     * Generates and uses a random port, this method is chainable.
     *
     * @param {object?} options An object containing the additional option to pass to the port generator, such as min and max value and ports to avoid.
     */
    useRandomPort(options){
        let port = Server.getRandomPort(options);
        if ( port === null ){
            //TODO: Add exception.
        }
        this.setPort(port);
        return this;
    }

    /**
     * Adds a router to the list of all the routers queried while handling client requests, this method is chainable.
     *
     * @param {Router} router An instance of the class "Router" representing the router to add.
     *
     * @return {Server}
     *
     * @throws InvalidArgumentException If an invalid router were given.
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
     * @throws InvalidArgumentException If an invalid router were given.
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
     * @param {Array<Router>} routers A sequential array containing all the routers to consider.
     *
     * @return {Server}
     *
     * @throws InvalidArgumentException If an invalid array where given.
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
     * @return {Array<Router>} A sequential array containing the routers.
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
     */
    start(handler){
        // If already running throw an exception, if the server needs to be restarted/refresh, use "restart" method instead.
        if ( this.isRunning() ){
            // TODO: Throw exception.
        }
        this.handler = typeof handler === 'function' ? handler : null;
        switch (this.type){
            case 'http':{
                // Create the HTTP server.
                this.server = http.createServer(async (request, handler) => {
                    if ( typeof this.handler === 'function' ){
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
                });
                // Finally start the server.
                this.server.listen(this.port);
                this.running = true;
            }break;
            case 'https':{

            }break;
            case 'ws':
            case 'websocket':{

            }break;
            case 'wss':{

            }break;
        }
        return this;
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
        }
        // Start it over again.
        this.start(this.handler);
        return this;
    }

    /**
     *
     *
     * @param request
     * @param handler
     * @param options
     * @return {Promise<void>}
     */
    static async defaultHandler(request, handler, options){
        try{
            request = new Request(request, handler);
            await Router.handle(request, handler, options);
        }catch(ex){
            if ( ex.constructor.name === 'NotFoundHttpException' ){
                request.throwHTTPError(404);
                return;
            }
            throw ex;
        }
    }
}

module.exports = Server;
