'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const WSOutputProcessor = require('../../WS/WSOutputProcessor');
const MessageProtocol = require('../../../MessageProtocol');

/**
 * Allows the generation and configuration of instances of the class "WSOutputProcessor" based on given configuration.
 */
class WSOutputProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = WSOutputProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the class that implements the protocol to use to decode client messages, this method is chainable.
     *
     * @param {?MessageProtocol} messageProtocol A class extending the "MessageProtocol" abstract class or null if no protocol should be used.
     *
     * @returns {WSOutputProcessorFactory}
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
     * Generates an instance of the class "WSOutputProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {WSOutputProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const connectionProcessor = new WSOutputProcessor();
        // Configuring class instance.
        connectionProcessor.configure(this._properties);
        return connectionProcessor;
    }
}

module.exports = WSOutputProcessorFactory;
