'use strict';

// Including Lala's modules.
const ProcessorFactory = require('../ProcessorFactory');
const WSConnectionProcessor = require('../../WS/WSConnectionProcessor');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "WSConnectionProcessor" based on given configuration.
 */
class WSConnectionProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = WSConnectionProcessor.getDefaultConfiguration();
    }

    /**
     * Adds a domain name to the list of all the domains clients are allowed to connect from, this method is chainable.
     *
     * @param {string} origin A string containing the domain name ot add.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid origin is given.
     */
    addAllowedOrigin(origin){
        if ( origin === '' || typeof origin !== 'string' ){
            throw new InvalidArgumentException('Invalid origin.', 1);
        }
        this._properties.allowedOrigins.add(origin);
        return this;
    }

    /**
     * Removes a domain name from the list of all the domains clients are allowed to connect from, this method is chainable.
     *
     * @param {string} origin A string containing the domain name to add.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid origin is given.
     */
    removeAllowedOrigin(origin){
        if ( origin === '' || typeof origin !== 'string' ){
            throw new InvalidArgumentException('Invalid origin.', 1);
        }
        this._properties.allowedOrigins.delete(origin);
        return this;
    }

    /**
     * Sets all the domain names the clients are allowed to connect from, this method is chainable.
     *
     * @param {?Set<string>} origins A set of strings containing all the allowed domain names.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid set is given.
     */
    setAllowedOrigins(origins){
        if ( origins !== null && !( origins instanceof Set ) ){
            throw new InvalidArgumentException('Invalid origins.', 1);
        }
        // Drops all currently defined origins.
        this.dropAllowedOrigins();
        if ( origins !== null ){
            // Validate and add new origins.
            for ( const origin of origins ){
                if ( origin !== '' && typeof origin === 'string' ){
                    this._properties.allowedOrigins.add(origin);
                }
            }
        }
        return this;
    }

    /**
     * Sets all the domain names the clients are allowed to connect from, this method is chainable.
     *
     * @param {?string[]} origins An array of strings containing all the allowed domain names.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setAllowedOriginsAsArray(origins){
        if ( origins !== null && !Array.isArray(origins) ){
            throw new InvalidArgumentException('Invalid origins.', 1);
        }
        // Drops all currently defined origins.
        this.dropAllowedOrigins();
        if ( origins !== null ){
            // Validate and add new origins.
            const length = origins.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( origins[i] !== '' && typeof origins[i] === 'string' ){
                    this._properties.allowedOrigins.add(origins[i]);
                }
            }
        }
        return this;
    }

    /**
     * Drops all the allowed origins that have been defined, this method is chainable.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    dropAllowedOrigins(){
        this._properties.allowedOrigins.clear();
        return this;
    }

    /**
     * Returns all the allowed origins that have been defined, this method is chainable.
     *
     * @returns {Set<string>} A set containing all the allowed origins as strings.
     */
    getAllowedOrigins(){
        return this._properties.allowedOrigins;
    }

    /**
     * Returns all the allowed origins that have been defined, this method is chainable.
     *
     * @returns {string[]} An array containing all the allowed origins as strings.
     */
    getAllowedOriginsAsArray(){
        return Array.from(this._properties.allowedOrigins);
    }

    /**
     * Adds a domain name to the list of all the domains clients are not allowed to connect from, this method is chainable.
     *
     * @param {string} origin A string containing the domain name to add.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid origin is given.
     */
    addDeniedOrigin(origin){
        if ( origin === '' || typeof origin !== 'string' ){
            throw new InvalidArgumentException('Invalid origin.', 1);
        }
        this._properties.deniedOrigins.add(origin);
        return this;
    }

    /**
     * Removes a domain name from the list of all the domains clients are not allowed to connect from, this method is chainable.
     *
     * @param origin A string containing the domain name to add.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid origin is given.
     */
    removeDeniedOrigin(origin){
        if ( origin === '' || typeof origin !== 'string' ){
            throw new InvalidArgumentException('Invalid origin.', 1);
        }
        this._properties.deniedOrigins.delete(origin);
        return this;
    }

    /**
     * Sets all the domain names the clients are not allowed to connect from, this method is chainable.
     *
     * @param {?Set<string>} origins A set of strings containing all the allowed domain names.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid set is given.
     */
    setDeniedOrigins(origins){
        if ( origins !== null && !( origins instanceof Set ) ){
            throw new InvalidArgumentException('Invalid origins.', 1);
        }
        // Drops all currently defined origins.
        this.dropDeniedOrigins();
        if ( origins !== null ){
            // Validate and add new origins.
            for ( const origin of origins ){
                if ( origin !== '' && typeof origin === 'string' ){
                    this._properties.deniedOrigins.add(origin);
                }
            }
        }
        return this;
    }

    /**
     * Sets all the domain names the clients are not allowed to connect from, this method is chainable.
     *
     * @param {?string[]} origins An array of strings containing all the allowed domain names.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setDeniedOriginsAsArray(origins){
        if ( origins !== null && !Array.isArray(origins) ){
            throw new InvalidArgumentException('Invalid origins.', 1);
        }
        // Drops all currently defined origins.
        this.dropDeniedOrigins();
        if ( origins !== null ){
            // Validate and add new origins.
            const length = origins.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( origins[i] !== '' && typeof origins[i] === 'string' ){
                    this._properties.allowedOrigins.add(origins[i]);
                }
            }
        }
        return this;
    }

    /**
     * Drops all the allowed origins that have been defined, this method is chainable.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    dropDeniedOrigins(){
        this._properties.deniedOrigins.clear();
        return this;
    }

    /**
     * Returns all the denied origins that have been defined, this method is chainable.
     *
     * @returns {Set<string>} A set containing all the denied origins as strings.
     */
    getDeniedOrigins(){
        return this._properties.deniedOrigins;
    }

    /**
     * Returns all the denied origins that have been defined, this method is chainable.
     *
     * @returns {string[]} An array containing all the denied origins as strings.
     */
    getDeniedOriginsAsArray(){
        return Array.from(this._properties.deniedOrigins);
    }

    /**
     * Adds a middleware function to be executed whenever a clients connection attempt occurs, this method is chainable.
     *
     * @param {string} identifier A string containing an unique name assigned to this middleware.
     * @param {WSConnectionMiddleware} handler The callback function that implements the middleware to execute.
     *
     * @returns {WSConnectionProcessorFactory}
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
     * @returns {WSConnectionProcessorFactory}
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
     * @param {?Object.<string, WSConnectionMiddleware>} middlewares An object containing all the middlewares to execute having as key the unique middleware identifier and as value the callback function that implements the middleware itself.
     *
     * @returns {WSConnectionProcessorFactory}
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
     * @param {?Map<string, WSConnectionMiddleware>} middlewares A map containing the middlewares having as key a string representing the middleware unique identifier and as value the callback function that implements the middleware itself.
     *
     * @returns {WSConnectionProcessorFactory}
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
     * @returns {WSConnectionProcessorFactory}
     */
    dropMiddlewares(){
        this._properties.middlewares.clear();
        return this;
    }

    /**
     * Returns all the middlewares that have been defined.
     *
     * @returns {Map<string, WSConnectionMiddleware>} A map containing the middleware and having as key the middleware unique identifier as a string and as value the callback function tha implements the middleware.
     */
    getMiddlewares(){
        return this._properties.middlewares;
    }

    /**
     * Adds a channel to the list of all the available channels, this method is chainable.
     *
     * @param {string} channel A string containing the channel name.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    addChannel(channel){
        if ( channel === '' || typeof channel !== 'string' ){
            throw new InvalidArgumentException('Invalid channel.', 1);
        }
        this._properties.channels.add(channel);
        return this;
    }

    /**
     * Removes a channel from the list of all the available channels, this method is chainable.
     *
     * @param {string} channel A string containing the channel name.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid channel name is given.
     */
    removeChannel(channel){
        if ( channel === '' || typeof channel !== 'string' ){
            throw new InvalidArgumentException('Invalid channel.', 1);
        }
        this._properties.channels.delete(channel);
        return this;
    }

    /**
     * Sets all the supported channels that clients can connect to, this method is chainable.
     *
     * @param {?Set<string>} channels A set containing all the allowed channels or null if all channels are allowed.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid set of channels is given.
     */
    setChannels(channels){
        if ( channels !== null && !( channels instanceof Set ) ){
            throw new InvalidArgumentException('Invalid channels.', 1);
        }
        // Drop all the channels defined.
        this.dropChannels();
        if ( channels !== null ){
            // Validate and add the given channels.
            for ( const channel of channels ){
                if ( channel !== '' && typeof channel === 'string' ){
                    this._properties.channels.add(channel);
                }
            }
        }
        return this;
    }

    /**
     * Sets all the supported channels that clients can connect to, this method is chainable.
     *
     * @param {?string[]} channels An array containing all the allowed channels or null if all channels are allowed.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array of channels is given.
     */
    setChannelsAsArray(channels){
        if ( channels !== null && !Array.isArray(channels) ){
            throw new InvalidArgumentException('Invalid channels.', 1);
        }
        // Drop all the channels defined.
        this.dropChannels();
        if ( channels !== null ){
            // Validate and add the given channels.
            const length = channels.length;
            for ( let i = 0 ; i < length ; i++ ){
                if ( channels[i] !== '' && typeof channels[i] === 'string' ){
                    this._properties.channels.add(channels[i]);
                }
            }
        }
        return this;
    }

    /**
     * Drops all the channels that have been declared allowing the clients to connect to any channel, this method is chainable.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    dropChannels(){
        this._properties.channels.clear();
        return this;
    }

    /**
     * Returns the list of all the channels clients can connect to.
     *
     * @returns {Set<string>} A set representing the list of all the channels clients can connect to, if any channel is allowed will be returned an empty set.
     */
    getChannels(){
        return this._properties.channels;
    }

    /**
     * Returns the list of all the channels clients can connect to.
     *
     * @returns {string[]} An array containing all the channels clients can connect to, if any channel is allowed will be returned an empty array.
     */
    getChannelsAsArray(){
        return Array.from(this._properties.channels);
    }

    /**
     * Sets if client origin is required to be present in the list of all the allowed origin or not, this method is chainable.
     *
     * @param {boolean} strictOriginCheck If set to "true" clients in order to connect the server must provide an origin declared in the list of the allowed origins.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    setStrictOriginCheck(strictOriginCheck){
        this._properties.strictOriginCheck = strictOriginCheck === true;
        return this;
    }

    /**
     * Returns if client origin is required to be present in the list of all the allowed origin or not.
     *
     * @returns {boolean} If client origin must have been declared first will be returned "true".
     */
    getStrictOriginCheck(){
        return this._properties.strictOriginCheck === true;
    }

    /**
     * Sets if clients can connect without declaring the origin they come from, this method is chainable.
     *
     * @param {boolean} allowAnonymousOrigin If set to "true" clients without an origin declared will be allowed anyway.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    setAllowAnonymousOrigin(allowAnonymousOrigin){
        this._properties.allowAnonymousOrigin = allowAnonymousOrigin === true;
        return this;
    }

    /**
     * Returns if clients without an origin declared can connect to the server or not.
     *
     * @returns {boolean} If clients without an origin can connect the server will be returned "true".
     */
    getAllowAnonymousOrigin(){
        return this._properties.allowAnonymousOrigin === true;
    }

    /**
     * Sets if connections must be tracked in order to detect if a client connection fall, this method is chainable.
     *
     * @param {boolean} followHeartbeat If set to "true" clients connection status will be tracked using periodic ping packets.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    setFollowHeartbeat(followHeartbeat){
        this._properties.followHeartbeat = followHeartbeat !== false;
        return this;
    }

    /**
     * Returns if connections status is being tracked or not.
     *
     * @returns {boolean}
     */
    getFollowHeartbeat(){
        return this._properties.followHeartbeat !== false;
    }

    /**
     * Sets if dead clients must be disconnected automatically or not, this method is chainable.
     *
     * @param {boolean} disconnectDeadConnections If set to "true" dead clients will be automatically disconnected once detected.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    setDisconnectDeadConnections(disconnectDeadConnections){
        this._properties.disconnectDeadConnections = disconnectDeadConnections === true;
        return this;
    }

    /**
     * Returns if dead clients should be disconnected automatically or not.
     *
     * @returns {boolean} If dead clients should be automatically disconnected will be returned "true".
     */
    getDisconnectDeadConnections(){
        return this._properties.disconnectDeadConnections === true;
    }

    /**
     * Sets the amount of time this server should wait for a response from a pinged client before marking it as dead, this method is chainable.
     *
     * @param {number} heartbeatTimeout An integer number greater than zero representing the mount of time in milliseconds.
     *
     * @returns {WSConnectionProcessorFactory}
     */
    setHeartbeatTimeout(heartbeatTimeout){
        if ( heartbeatTimeout === null || isNaN(heartbeatTimeout) || heartbeatTimeout <= 0 ){
            throw new InvalidArgumentException('Invalid heartbeat timeout value.', 1);
        }
        this._properties.heartbeatTimeout = heartbeatTimeout;
        return this;
    }

    /**
     * Returns the amount of time this server should wait for a response from a pinged client.
     *
     * @returns {number} An integer number greater than zero representing the mount of time in milliseconds defined.
     */
    getHeartbeatTimeout(){
        return this._properties.heartbeatTimeout;
    }

    /**
     * Sets the amount of time that must intercourse between pings used to spot dead clients, this method is chainable.
     *
     * @param {number} heartbeatInterval An integer number greater than zero representing the mount of time in milliseconds.
     *
     * @returns {WSConnectionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid time amount is given.
     */
    setHeartbeatInterval(heartbeatInterval){
        if ( heartbeatInterval === null || isNaN(heartbeatInterval) || heartbeatInterval <= 0 ){
            throw new InvalidArgumentException('Invalid heartbeat interval value.', 1);
        }
        this._properties.heartbeatInterval = heartbeatInterval;
        return this;
    }

    /**
     * Returns the amount of time that must intercourse between client pings.
     *
     * @returns {number} An integer number greater than zero representing the mount of time in milliseconds defined.
     */
    getHeartbeatInterval(){
        return this._properties.heartbeatInterval;
    }

    /**
     * Generates an instance of the class "WSConnectionProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {WSConnectionProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const connectionProcessor = new WSConnectionProcessor();
        // Configuring class instance.
        connectionProcessor.configure(this._properties);
        return connectionProcessor;
    }
}

module.exports = WSConnectionProcessorFactory;
