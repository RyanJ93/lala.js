'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const {
    RequestProcessorFactory,
    InputProcessorFactory,
    AuthorizationProcessorFactory,
    OutputProcessorFactory,
    ExceptionProcessorFactory
} = require('./processors/factories');
const Firewall = require('./Firewall');
const { generateUUID } = require('../helpers');
const {
    RuntimeException,
    InvalidArgumentException,
    NotCallableException,
    ForbiddenHTTPException
} = require('../Exceptions');

/**
 * This class allows to create a server by providing basic features such as access middleware support.
 *
 * @abstract
 */
class Server extends EventEmitter {
    /**
     * Validates a given processor factory class according to its type and the corresponding class that it must be or extend.
     *
     * @param {string} type A string containing the processor type to validate.
     * @param {ProcessorFactory} processor The class to validate, it must extend the "ProcessorFactory" class.
     *
     * @returns {boolean} If the given class is valid will be returned "true".
     *
     * @protected
     */
     _validateProcessorClass(type, processor){
        const classes = this.getProcessorClasses();
        return classes.hasOwnProperty(type) && processor instanceof classes[type];
    }

    /**
     * Runs all the rules defined in this server's firewall instance for a given request processing phase.
     *
     * @param {string} checkpoint A string containing the name of the request processing phase being execute.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @throws {ForbiddenHTTPException} If current client request should be blocked according to executed firewall rules.
     *
     * @async
     * @protected
     */
    async _runFirewallCheckpoint(checkpoint, request, response){
        const consent = await this._firewall.process(checkpoint, request, response);
        if ( consent !== true ){
            throw new ForbiddenHTTPException('Request was rejected by firewall.', 1);
        }
    }

    /**
     * Executes request processing's first step by determining if current request can be processed or not.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @async
     * @protected
     */
    async _preprocessRequest(request, response){
        if ( !request.hasOwnProperty('server') ){
            request.server = this;
        }
        // Checking if the request can continue according to firewall's rules.
        await this._runFirewallCheckpoint('request.preprocess', request, response);
        const processor = this._requestProcessorFactory.craft();
        await processor.process(request, response);
        this.emit('request.preprocess', request, response);
    }

    /**
     * Completes request data processing making it available for further processing steps.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<void>}
     *
     * @throws {ForbiddenHTTPException} If this request gets reject by one or more of the defined access middleware functions.
     *
     * @async
     * @protected
     */
    async _prepareRequest(request, response){
        // Checking if the request can continue according to firewall's rules.
        await this._runFirewallCheckpoint('request.prepare', request, response);
        // Checking if the request can be processed according to provided access middleware functions.
        let processor = this._authorizationProcessorFactory.craft();
        const consent = await processor.runAccessMiddlewares(request, response);
        if ( consent !== true ){
            throw new ForbiddenHTTPException('Request was rejected by access middlewares.', 2);
        }
        processor = this._inputProcessorFactory.craft();
        await processor.process(request, response);
        this.emit('request.prepare', request, response);
    }

    /**
     * Checks if current request can be processed according to authentication settings defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _checkAuthorization(request, response){
        // Checking if the request can continue according to firewall's rules.
        await this._runFirewallCheckpoint('request.authorization', request, response);
        const processor = this._authorizationProcessorFactory.craft();
        await processor.process(request, response);
        this.emit('request.authorization', request, response);
    }

    /**
     * Processes the output defined for current client request sending it to the connected client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _processOutput(request, response){
        // Checking if the request can continue according to firewall's rules.
        await this._runFirewallCheckpoint('request.outputProcess', request, response);
        if ( response.hasOwnProperty('rawOutput') ){
            // An output has been defined, let's processing and sending it to the client.
            const processor = this._outputProcessorFactory.craft();
            await processor.updateContext(request, response).process(request, response);
        }
        this.emit('request.outputProcess', request, response);
    }

    /**
     * Cleans up all the temporary resources and files associated with current client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @protected
     */
    _completeRequest(request, response){
        setImmediate(async () => {
            const processor = this._requestProcessorFactory.craft();
            // Remove all the temporary files containing uploaded files associated with current client request.
            await processor.killRequest(request);
        });
    }

    /**
     * Handles an exception thrown during request processing according to defined exception handlers.
     *
     * @param {Error} exception The exception to handle as an instance of the native class Error or the built-in class Exception.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _processException(exception, request, response){
        try{
            this.emit('exception', exception, request, response, this);
            const processor = this._exceptionProcessorFactory.craft();
            response.rawOutput = await processor.process(exception, request, response);
            // Process, log and notify the client about the exception that has been thrown.
            await this._processOutput(request, response);
        }catch(ex){
            //
            console.log(ex);
            response.writeHead(500, 'Internal Server Error');
            response.write('Internal Server Error.');
            response.end();
        }
    }

    /**
     * Processes a whole client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _handleRequest(request, response){
        try{
            // Add basic properties, process accepted languages and GET parameters.
            await this._preprocessRequest(request, response);
            // Loads and processes user provided input data.
            await this._prepareRequest(request, response);
            // Check if current user's permissions allow to access to this resource.
            await this._checkAuthorization(request, response);
            // Serialize the raw output returned by the route handler method and then send it to the client.
            await this._processOutput(request, response);
        }catch(ex){
            // Process, log and notify the client about the exception that has been thrown.
            await this._processException(ex, request, response);
        }finally{
            // Remove all the temporary resources associated to current request and then close the connection.
            this._completeRequest(request, response);
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
        if ( new.target === 'Server' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {null} [_server=null] An object representing the server implementation instantiated from a native or external module.
         *
         * @protected
         */
        this._server = null;

        /**
         * @type {Object.<*, *>} _options An object containing the custom options that should be considered when a server is created.
         *
         * @protected
         */
        this._options = {};

        /**
         * @type {string} _id A string containing an unique ID for this server used for caching purposes, the ID is a string representation of an UUID version 4.
         *
         * @protected
         */
        this._id = generateUUID(4, false);

        /**
         * @type {RequestProcessorFactory} _requestProcessorFactory An instance of the class "RequestProcessorFactory" representing the object used to craft the class that will process request data.
         *
         * @protected
         */
        this._requestProcessorFactory = new RequestProcessorFactory();

        /**
         * @type {InputProcessorFactory} _inputProcessorFactory An instance of the class "InputProcessorFactory" used to generate the object that will process the client provided input data.
         *
         * @protected
         */
        this._inputProcessorFactory = new InputProcessorFactory();

        /**
         * @type {AuthorizationProcessorFactory} _authorizationProcessorFactory An instance of the class "AuthorizationProcessorFactory" used to generate instances of the class that will authenticate client requests.
         *
         * @protected
         */
        this._authorizationProcessorFactory = new AuthorizationProcessorFactory();

        /**
         * @type {OutputProcessorFactory} _outputProcessorFactory
         *
         * @protected
         */
        this._outputProcessorFactory = new OutputProcessorFactory();

        /**
         * @type {ExceptionProcessorFactory} _exceptionProcessorFactory
         *
         * @protected
         */
        this._exceptionProcessorFactory = new ExceptionProcessorFactory();

        /**
         * @type {Firewall} _firewall An instance of the class "Firewall", or a derived class, that
         *
         * @protected
         */
        this._firewall = new Firewall();
    }

    /**
     * Sets the class used to generate the instances of the "RequestProcessor" class used to prepare the incoming client requests, this method is chainable.
     *
     * @param {RequestProcessorFactory} factory An instance of the class "RequestProcessorFactory" representing the factory class.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setRequestProcessorFactory(factory){
        if ( !this._validateProcessorClass('request', factory) ){
            throw new InvalidArgumentException('Invalid factory class.', 1);
        }
        this._requestProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the class used to generate the instances of the "RequestProcessor" class.
     *
     * @returns {RequestProcessorFactory} An instance of the class "RequestProcessorFactory" representing the factory class being in use.
     */
    getRequestProcessorFactory(){
        return this._requestProcessorFactory;
    }

    /**
     * Sets the class used to generate the instances of the "InputProcessor" class used to process input data sent by clients, this method is chainable.
     *
     * @param {InputProcessorFactory} factory An instance of the class "InputProcessorFactory" representing the factory class.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setInputProcessorFactory(factory){
        if ( !this._validateProcessorClass('input', factory) ){
            throw new InvalidArgumentException('Invalid factory object.', 1);
        }
        this._inputProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the class used to generate the instances of the "InputProcessor" class.
     *
     * @returns {InputProcessorFactory} An instance of the class "InputProcessorFactory" representing the factory class being in use.
     */
    getInputProcessorFactory(){
        return this._inputProcessorFactory;
    }

    /**
     * Sets the class used to generate the instances of the "AuthorizationProcessor" class used to authenticate client requests, this method is chainable.
     *
     * @param {AuthorizationProcessorFactory} factory An instance of the class "AuthorizationProcessorFactory" representing the factory class.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setAuthorizationProcessorFactory(factory){
        if ( !this._validateProcessorClass('authorization', factory) ){
            throw new InvalidArgumentException('Invalid factory object.', 1);
        }
        this._authorizationProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the class used to generate the instances of the "AuthorizationProcessor" class.
     *
     * @returns {AuthorizationProcessorFactory} An instance of the class "AuthorizationProcessorFactory" representing the factory class being in use.
     */
    getAuthorizationProcessorFactory(){
        return this._authorizationProcessorFactory;
    }

    /**
     * Sets the class used to generate the instances of the "OutputProcessor" class used to prepare and send requests' response, this method is chainable.
     *
     * @param {OutputProcessorFactory} factory An instance of the class "OutputProcessorFactory" representing the factory class.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setOutputProcessorFactory(factory){
        if ( !this._validateProcessorClass('output', factory) ){
            throw new InvalidArgumentException('Invalid factory object.', 1);
        }
        this._outputProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the class used to generate the instances of the "OutputProcessor" class.
     *
     * @returns {OutputProcessorFactory} An instance of the class "OutputProcessorFactory" representing the factory class being in use.
     */
    getOutputProcessorFactory(){
        return this._outputProcessorFactory;
    }

    /**
     * Sets the class used to generate the instances of the "ExceptionProcessor" class used to handle errors and exceptions occurred during request processing, this method is chainable.
     *
     * @param {ExceptionProcessorFactory} factory An instance of the class "ExceptionProcessorFactory" representing the factory class.
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid factory class is given.
     */
    setExceptionProcessorFactory(factory){
        if ( !this._validateProcessorClass('exception', factory) ){
            throw new InvalidArgumentException('Invalid factory object.', 1);
        }
        this._exceptionProcessorFactory = factory;
        return this;
    }

    /**
     * Returns the class used to generate the instances of the "ExceptionProcessor" class.
     *
     * @returns {ExceptionProcessorFactory} An instance of the class "ExceptionProcessorFactory" representing the factory class being in use.
     */
    getExceptionProcessorFactory(){
        return this._exceptionProcessorFactory;
    }

    /**
     * Sets the firewall to use during request processing, this method is chainable.
     *
     * @param {Firewall} firewall An instance of the class "Firewall".
     *
     * @returns {Server}
     *
     * @throws {InvalidArgumentException} If an invalid firewall instance is given.
     */
    setFirewall(firewall){
        if ( !( firewall instanceof Firewall ) ){
            throw new InvalidArgumentException('Invalid firewall instance.', 1);
        }
        this._firewall = firewall;
        return this;
    }

    /**
     * Returns the firewall being used in request processing.
     *
     * @returns {Firewall} The instance of the class "Firewall" being used.
     */
    getFirewall(){
        return this._firewall;
    }

    /**
     * Returns the unique ID of this server.
     *
     * @returns {string} A string representation of this server ID, an UUID version 4.
     */
    getID(){
        return this._id;
    }

    /**
     * Sets the custom option to consider in server creation, this method is chainable.
     *
     * @param {Object.<*, *>} options An object having as key a string and as value the option value containing all the custom options to consider.
     *
     * @return {Server}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid object.');
        }
        this._options = options !== null ? options : {};
        return this;
    }

    /**
     * Returns the custom option to consider in server creation.
     *
     * @return {{string: *}} An object containing all the custom options defined.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Returns the classes used in processor validation.
     *
     * @returns {Object.<string, function>} An object having as key the processor identifier and as value the processor class.
     */
    getProcessorClasses(){
        return {
            request: RequestProcessorFactory,
            input: InputProcessorFactory,
            authorization: AuthorizationProcessorFactory,
            output: OutputProcessorFactory,
            exception: ExceptionProcessorFactory,
        };
    }

    /**
     * Starts the server, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async start(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Stops the server, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async stop(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Restarts the server, this method needs to be overridden and implemented.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    async restart(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Returns if this server is currently running and listening for requests.
     *
     * @returns {boolean} If this server is ready to handle requests will be returned "true".
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @async
     */
    isRunning(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Server;
