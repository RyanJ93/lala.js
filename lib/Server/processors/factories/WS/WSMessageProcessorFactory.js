'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const WSMessageProcessor = require('../../WS/WSMessageProcessor');
const MessageProtocol = require('../../../MessageProtocol');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "WSMessageProcessor" based on given configuration.
 */
class WSMessageProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = WSMessageProcessor.getDefaultConfiguration();
    }

    /**
     * Adds a middleware function to be executed whenever a clients connection attempt occurs, this method is chainable.
     *
     * @param {string} identifier A string containing an unique name assigned to this middleware.
     * @param {WSMessageMiddlewareHandler} handler The callback function that implements the middleware to execute.
     *
     * @returns {WSMessageProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     * @throws {InvalidArgumentException} If an invalid callback function is given.
     */
    addMiddleware(identifier, handler){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid middleware identifier.', 1);
        }
        if ( typeof handler !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 2);
        }
        this._properties.middlewares.set(identifier, handler);
        return this;
    }

    /**
     * Removes a middlewares from the list of all the middlewares to execute whenever a client connection attempt occurs, this method is chainable.
     *
     * @param {string} identifier A string containing the name of the middleware to remove.
     *
     * @returns {WSMessageProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     */
    removeMiddleware(identifier){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid middleware identifier.', 1);
        }
        this._properties.middlewares.delete(identifier);
        return this;
    }

    /**
     * Sets the middlewares to execute whenever a client connection attempt occurs, this method is chainable.
     *
     * @param {?Object.<string, WSMessageMiddlewareHandler>} middlewares An object containing all the middlewares to execute having as key the unique middleware identifier and as value the callback function that implements the middleware itself.
     *
     * @returns {WSMessageProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid object containing middlewares is given.
     */
    setMiddlewaresAsObject(middlewares){
        if ( middlewares !== null && typeof middlewares !== 'object' ){
            throw new InvalidArgumentException('Invalid middlewares.', 1);
        }
        // Drops currently defined middlewares.
        this._properties.middlewares.clear();
        if ( middlewares !== null ){
            // Validate and add current ones.
            for ( const identifier in middlewares ){
                if ( middlewares.hasOwnProperty(identifier) && identifier !== '' && typeof middlewares[identifier] === 'function' ){
                    this._properties.middlewares.set(identifier, middlewares[identifier]);
                }
            }
        }
        return this;
    }

    /**
     * Sets the middlewares to execute whenever a client connection attempt occurs, this method is chainable.
     *
     * @param {?Map<string, WSMessageMiddlewareHandler>} middlewares A map containing the middlewares having as key a string representing the middleware unique identifier and as value the callback function that implements the middleware itself.
     *
     * @returns {WSMessageProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid map containing middlewares is given.
     */
    setMiddlewares(middlewares){
        if ( middlewares !== null && !( middlewares instanceof Map ) ){
            throw new InvalidArgumentException('Invalid middlewares.', 1);
        }
        // Drops currently defined middlewares.
        this._properties.middlewares.clear();
        if ( middlewares !== null ){
            // Validate and add current ones.
            for ( const [identifier, handler] of middlewares ){
                if ( typeof identifier === 'string' && identifier !== '' && typeof handler !== 'function' ){
                    this._properties.middlewares.set(identifier, handler);
                }
            }
        }
        return this;
    }

    /**
     * Drops all the middlewares that have been defined, this method is chainable.
     *
     * @returns {WSMessageProcessorFactory}
     */
    dropMiddlewares(){
        this._properties.middlewares.clear();
        return this;
    }

    /**
     * Returns all the middlewares that have been defined.
     *
     * @returns {Map<string, WSMessageMiddlewareHandler>} A map containing the middleware and having as key the middleware unique identifier as a string and as value the callback function tha implements the middleware.
     */
    getMiddlewares(){
        return this._properties.middlewares;
    }

    /**
     * Sets the callback function to invoke whenever a message is received, this method is chainable.
     *
     * @param {?WSMessageControllerCallback} controller A callback function or null if no function should be invoked.
     * @param {?string} [channel] A string containing the name of the channel the given controller should handle the messages from, if null it will be used as the default one.
     *
     * @returns {WSMessageProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid function is given.
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    setController(controller, channel = null){
        if ( controller !== null && typeof controller !== 'function' ){
            throw new InvalidArgumentException('Invalid controller function.', 1);
        }
        if ( channel !== null && ( channel === '' || typeof channel !== 'string' ) ){
            throw new InvalidArgumentException('Invalid channel name.', 2);
        }
        if ( channel === null ){
            channel = '*';
        }
        if ( controller === null ){
            this._properties.controllers.delete(channel);
        }else{
            this._properties.controllers.set(channel, controller);
        }
        return this;
    }

    /**
     * Returns the callback function to invoke whenever a message is received that has been defined.
     *
     * @param {?string} [channel]
     *
     * @returns {?WSMessageControllerCallback} The callback function or null if no function has been defined.
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    getController(channel = null){
        if ( channel !== null && ( channel === '' || typeof channel !== 'string' ) ){
            throw new InvalidArgumentException('Invalid channel name.', 1);
        }
        const controller = this._properties.controllers.get(channel === null ? '*' : channel);
        return typeof controller !== 'function' ? null : controller;
    }

    /**
     * Sets the class that implements the protocol to use to decode client messages, this method is chainable.
     *
     * @param {?MessageProtocol} messageProtocol A class extending the "MessageProtocol" abstract class or null if no protocol should be used.
     *
     * @returns {WSMessageProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid protocol class is given.
     */
    setMessageProtocol(messageProtocol){
        if ( messageProtocol !== null && ( typeof messageProtocol !== 'function' || !MessageProtocol.isPrototypeOf(messageProtocol) ) ){
            throw new InvalidArgumentException('Invalid protocol class.', 1);
        }
        this._properties.messageProtocol = messageProtocol;
        return this;
    }

    /**
     * Returns the class that implements the protocol being used to decode client messages.
     *
     * @returns {?MessageProtocol} A class extending the "MessageProtocol" abstract class or null if no protocol is being used.
     */
    getMessageProtocol(){
        return this._properties.messageProtocol;
    }

    /**
     * Generates an instance of the class "WSMessageProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {WSMessageProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const messageProcessor = new WSMessageProcessor();
        // Configuring class instance.
        messageProcessor.configure(this._properties);
        return messageProcessor;
    }
}

module.exports = WSMessageProcessorFactory;
