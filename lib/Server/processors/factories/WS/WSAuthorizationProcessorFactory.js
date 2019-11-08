'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const WSAuthorizationProcessor = require('../../WS/WSAuthorizationProcessor');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "WSAuthorizationProcessor" based on given configuration.
 */
class WSAuthorizationProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = WSAuthorizationProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the callback function to invoke in order to authenticate a WebSocket client, this method is chainable.
     *
     * @param {?WSAuthenticationCallback} callback The callback function to invoke.
     * @param {?string} [channel] A string containing the name of the channel this function will be applied to, if null this callback will be used as the default one.
     *
     * @returns {WSAuthorizationProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid function is given.
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    setCallback(callback, channel = null){
        if ( callback !== null && typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid callback function.', 1);
        }
        if ( channel !== null && ( channel === '' || typeof channel !== 'string' ) ){
            throw new InvalidArgumentException('Invalid channel name.', 2);
        }
        if ( channel === null ){
            channel = '*';
        }
        if ( callback === null ){
            this._properties.callbacks.delete(channel);
        }else{
            this._properties.callbacks.set(channel, callback);
        }
        return this;
    }

    /**
     * Returns the callback function that will be invoke in order to authenticate a WebSocket client.
     *
     * @param {?string} [channel] A string containing the name of the channel this function will be applied to, if null this callback will be used as the default one.
     *
     * @returns {?WSAuthenticationCallback}
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    getCallback(channel = null){
        if ( channel !== null && ( channel === '' || typeof channel !== 'string' ) ){
            throw new InvalidArgumentException('Invalid channel name.', 1);
        }
        const callback = this._properties.callbacks.get(channel === null ? '*' : channel);
        return typeof callback !== 'function' ? null : callback;
    }

    /**
     * Generates an instance of the class "WSAuthorizationProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {WSAuthorizationProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const authorizationProcessor = new WSAuthorizationProcessor();
        // Configuring class instance.
        authorizationProcessor.configure(this._properties);
        return authorizationProcessor;
    }
}

module.exports = WSAuthorizationProcessorFactory;
