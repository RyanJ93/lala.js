'use strict';

// Including Lala's modules.
const HTTPCookieProcessor = require('./processors/HTTP/HTTPCookieProcessor');
const {
    HTTPCookieProcessorFactory,
    HTTPRequestProcessorFactory,
    HTTPExceptionHandlerFactory,
    HTTPInputProcessorFactory,
    HTTPSessionProcessorFactory
} = require('./processors/factories/HTTP');
const RoutedServer = require('./RoutedServer');
const { generateUUID } = require('../helpers');
const {
    InvalidArgumentException,
    RuntimeException
} = require('../Exceptions');

/**
 * Implements a base layer for HTTP server implementation.
 *
 * @abstract
 */
class HTTPCore extends RoutedServer {
    /**
     * Parses cookies sent by the client and then add them into the request object, plus, it injects cookie helper functions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    async _prepareCookies(request, response){
        const processor = this._cookieProcessorFactory.craft();
        await processor.process(request, response);
        this.emit('request.cookiePreparation', request, response);
    }

    /**
     * Processes client sessions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    async _prepareSessions(request, response){
        const processor = this._sessionProcessorFactory.craft();
        // TODO: Add session support, task #LALA-13.
        this.emit('request.sessionPreparation', request, response);
    }

    /**
     * Processes request data, such as POST parameters and uploaded files, cookies and HTTP sessions.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @override
     * @protected
     */
    async _prepareRequest(request, response){
        await super._prepareRequest(request, response);
        // Processing HTTP cookies.
        await this._prepareCookies(request, response);
        // Processing HTTP sessions.
        await this._prepareSessions(request, response);
    }

    /**
     * Generates a response for the client according to data defined in the "rawOutput" property inside the "request" object given.
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
    async _processOutput(request, response){
        if ( response.hasOwnProperty('finished') && response.finished === false ) {
            if ( request.hasOwnProperty('cookieProcessor') && request.cookieProcessor instanceof HTTPCookieProcessor ){
                // Generate the HTTP header that contains cookie to store on client side.
                request.cookieProcessor.writeHeader(response);
            }
        }
        await super._processOutput(request, response);
    }

    /**
     * Adds a given connection to the list of all the active connections of this server.
     *
     * @param {Object} connection An object representing the connection to track.
     *
     * @protected
     */
    _trackConnection(connection){
        if ( !connection.hasOwnProperty('connectionID') ){
            // Assign an unique ID to this connection.
            connection.connectionID = generateUUID(4, false);
            this._connections.set(connection.connectionID, connection);
        }
    }

    /**
     * Removes a given connection from the list of all the active connections of this server.
     *
     * @param {Object} connection An object representing the connection to track.
     *
     * @protected
     */
    _untrackConnection(connection){
        if ( connection.hasOwnProperty('connectionID') ){
            this._connections.delete(connection.connectionID);
            delete connection.connectionID;
        }
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'HTTPCore' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {HTTPCookieProcessorFactory} _cookieProcessorFactory An instance of the class "HTTPCookieProcessorFactory" used to configure and then generate instance of the class "HTTPCookieProcessor".
         *
         * @protected
         */
        this._cookieProcessorFactory = new HTTPCookieProcessorFactory();

        /**
         * @type {HTTPSessionProcessorFactory} _sessionProcessorFactory An instance of the class "HTTPSessionProcessorFactory" used to configure and then generate instance of the class "HTTPSessionProcessor".
         *
         * @protected
         */
        this._sessionProcessorFactory = new HTTPSessionProcessorFactory();

        /**
         * @type {Map<string, Object>} _connections
         *
         * @protected
         */
        this._connections = new Map();

        // Defines the HTTP specific processor factories.
        this._requestProcessorFactory = new HTTPRequestProcessorFactory();
        this._exceptionProcessorFactory = new HTTPExceptionHandlerFactory();
        this._inputProcessorFactory = new HTTPInputProcessorFactory();
    }

    /**
     * Sets the factory class to use whenever generating instances of the "HTTPCookieProcessor" class, this method is chainable.
     *
     * @param {HTTPCookieProcessorFactory} factory An instance of the class "HTTPCookieProcessorFactory" representing the factory class to use.
     *
     * @returns {HTTPCore}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setHTTPCookieProcessorFactory(factory){
        if ( !this._validateProcessorClass('cookie', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._cookieProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "HTTPCookieProcessor" class.
     *
     * @returns {HTTPCookieProcessorFactory} An instance of the class "HTTPCookieProcessorFactory" representing the factory class in use.
     */
    getHTTPCookieProcessorFactory(){
        return this._cookieProcessorFactory;
    }

    /**
     * Sets the factory class to use whenever generating instances of the "HTTPSessionProcessor" class, this method is chainable.
     *
     * @param {HTTPSessionProcessorFactory} factory An instance of the class "HTTPSessionProcessorFactory" representing the factory class to use.
     *
     * @returns {HTTPCore}
     */
    setHTTPSessionProcessorFactory(factory){
        if ( !this._validateProcessorClass('session', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._sessionProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the factory class being used to generate instances of the "HTTPSessionProcessor" class.
     *
     * @returns {HTTPSessionProcessorFactory} An instance of the class "HTTPCookieProcessorFactory" representing the factory class in use.
     */
    getHTTPSessionProcessorFactory(){
        return this._sessionProcessorFactory;
    }

    /**
     * Returns the classes used in processor validation.
     *
     * @returns {Object.<string, function>} An object having as key the processor identifier and as value the processor class.
     */
    getProcessorClasses(){
        return Object.assign(super.getProcessorClasses(), {
            cookie: HTTPCookieProcessorFactory,
            session: HTTPSessionProcessorFactory,
            request: HTTPRequestProcessorFactory,
            exception: HTTPExceptionHandlerFactory,
            input: HTTPInputProcessorFactory
        });
    }

    /**
     * Returns all the sockets currently connected to this server.
     *
     * @returns {Map<string, module:http.Socket>} A map having as key an unique ID associated to the connection and as value an instance of the native "Socket" class representing the connection.
     */
    getConnections(){
        return this._connections;
    }

    /**
     * Returns how many sockets are currently connected to this server.
     *
     * @returns {number} An integer number greater or equal than zero.
     */
    getConnectionsCount(){
        return this._connections.size;
    }
}

module.exports = HTTPCore;
