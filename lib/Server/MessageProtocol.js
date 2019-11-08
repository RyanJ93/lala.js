'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    NotCallableException
} = require('../Exceptions');

/**
 * Implements a custom protocol to be applied to ingoing, outgoing WebSocket messages.
 *
 * @abstract
 */
class MessageProtocol {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'MessageProtocol' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Decodes the given message according to the protocol implemented by this class.
     *
     * @param {string} message A string containing the message received from the client.
     *
     * @returns {*} The decoded message.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    wrap(message){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Encodes the given message before being sent to the client according to the protocol implemented by this class.
     *
     * @param {*} message The message to encode.
     *
     * @returns {*} The encoded message.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    unwrap(message){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = MessageProtocol;
