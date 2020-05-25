'use strict';

// Including Lala's modules.
const Interceptor = require('./Interceptor');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * An interceptor that allows to limit traffic from defined IP addresses.
 */
class IPFilterInterceptor extends Interceptor {
    /**
     * Generates all the possible combination of IP wildcards based on the given IP address.
     *
     * @param {string} ip A string containing the IP address to process.
     *
     * @return {Set<string>} A set containing the original IP address plus each unique wildcard found.
     *
     * @protected
     */
    static _getIPWildcards(ip){
        // Get the right separator according to IP version (IPv4 => ".", IPv6 => ":").
        const separator = ip.indexOf(':') === -1 ? '.' : ':';
        // Split the given IP address into components (192.168.1.1 => [192, 168, 1, 1]).
        const components = ip.split(separator);
        const length = components.length;
        const ips = new Set([ip]);
        // Loop to define the amount of wildcard signs to insert in generated combinations.
        for ( let size = 1 ; size < length ; size++ ){
            // Loop trough components to replace as many entries as defined by current "size" value.
            for ( let i = 0 ; i < length ; i++ ){
                const end = i + size;
                // Generate combination according to current index and wildcard signs amount.
                const buffer = components.map((element, index) => {
                    return index < end && index >= i ? '*' : element;
                }).join(separator);
                ips.add(buffer);
            }
        }
        // Add last combination, when every component is replaced by a wildcard char (192.168.1.1 => *.*.*.*).
        ips.add(( '*' + separator ).repeat(length).slice(0, -1));
        return ips;
    }

    /**
     * Performs IP checks on incoming connections.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<boolean>} If connection is allowed according to defined IP settings will be returned "true".
     *
     * @async
     * @protected
     */
    async _filterIncomingConnection(request, response){
        const ip = request.connection.remoteAddress;
        // Generate all the wildcard strings based on the given ip address, for instance: 192.168.1.1 => 192.168.1.*, 192.168.*.*, 192.*.*.*, *.*.*.*
        const wildcards = IPFilterInterceptor._getIPWildcards(ip);
        let allowed = true;
        if ( this._allowedOnly === true ){
            // The given ip address must be included in the white list to be accepted.
            allowed = false;
            for ( const item of wildcards ){
                if ( this._allowedIPs.has(item) ){
                    allowed = true;
                    break;
                }
            }
        }
        if ( allowed ){
            for ( const item of wildcards ){
                if ( !this._allowedIPs.has(item) && this._deniedIPs.has(item) ){
                    allowed = false;
                    break;
                }
            }
        }
        return allowed;
    }

    /**
     * Defines all the callback functions to execute for each checkpoint.
     *
     * @protected
     */
    _setupBreakpoints(){
        this._breakpoints['request.preprocess'] = (request, response) => {
            return this._filterIncomingConnection(request, response);
        };
    }

    /**
     * The class constructor.
     *
     * @param {?string[]} [allowedIPs=null] An array containing all the allowed IP as string representations.
     * @param {?string[]} [deniedIPs=null] An array containing all the IP addresses to blacklist as string representations.
     */
    constructor(allowedIPs = null, deniedIPs = null){
        super();

        /**
         * @type {Set<string>} _allowedIPs A set containing all the whitelisted IP addresses as string representations.
         *
         * @protected
         */
        this._allowedIPs = new Set();

        /**
         * @type {Set<string>} _deniedIPs A set containing all the blacklisted IP addresses as string representations.
         *
         * @protected
         */
        this._deniedIPs = new Set();

        /**
         * @type {boolean} [_allowedOnly=false] If set to "true" requests made by whitelisted IP will be accepted only.
         *
         * @protected
         */
        this._allowedOnly = false;

        if ( Array.isArray(allowedIPs) ){
            this.setAllowedIPs(allowedIPs);
        }
        if ( Array.isArray(deniedIPs) ){
            this.setDeniedIPs(deniedIPs);
        }
        // Setup the callback functions to handle required checkpoints.
        this._setupBreakpoints();
    }

    /**
     * Adds one IP address to the IP address whitelist, this method is chainable.
     *
     * @param {string} ip A string representation of the IP address to add.
     *
     * @returns {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid IP address is given.
     */
    addAllowedIP(ip){
        if ( ip === '' || typeof ip !== 'string' ){
            throw new InvalidArgumentException('Invalid IP address.', 1);
        }
        this._allowedIPs.add(ip);
        return this;
    }

    /**
     * Adds one or more IP addresses to the IP address whitelist, this method is chainable.
     *
     * @param {string[]} ips An array containing the IP addresses as string representations.
     *
     * @returns {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    addAllowedIPs(ips){
        if ( !Array.isArray(ips) ){
            throw new InvalidArgumentException('Invalid IP address array.', 1);
        }
        const length = ips.length;
        for ( let i = 0 ; i < length ; i++ ){
           if ( ips[i] !== '' && typeof ips[i] === 'string' ){
               this._allowedIPs.add(ips[i]);
           }
        }
        return this;
    }

    /**
     * Removes a given IP address from the IP address whitelist, this method is chainable.
     *
     * @param ip A string representation of the IP address to remove.
     *
     * @returns {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid IP address representation is given.
     */
    removeAllowedIP(ip){
        if ( ip === '' || typeof ip !== 'string' ){
            throw new InvalidArgumentException('Invalid IP address.', 1);
        }
        this._allowedIPs.delete(ip);
        return this;
    }

    /**
     * Removes one or more IP addresses from the IP address whitelist, this method is chainable.
     *
     * @param {string[]} ips An array containing the IP addresses to remove as string representations.
     *
     * @returns {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    removeAllowedIPs(ips){
        if ( !Array.isArray(ips) ){
            throw new InvalidArgumentException('Invalid IP address array.', 1);
        }
        const length = ips.length;
        for ( let i = 0 ; i < length ; i++ ){
            this._allowedIPs.delete(ips[i]);
        }
        return this;
    }

    /**
     * Sets the allowed IP addresses, this method is chainable.
     *
     * @param {string[]} ips An array containing the IP addresses as string representations.
     *
     * @returns {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setAllowedIPs(ips){
        if ( !Array.isArray(ips) ){
            throw new InvalidArgumentException('Invalid IP address array.', 1);
        }
        this.dropAllowedIPs().addAllowedIPs(ips);
        return this;
    }

    /**
     * Removes all the IP addresses from the IP address whitelist, this method is chainable.
     *
     * @returns {IPFilterInterceptor}
     */
    dropAllowedIPs(){
        this._allowedIPs = new Set();
        return this;
    }

    /**
     * Returns all the whitelisted IP addresses.
     *
     * @returns {Set<string>} A set containing all the whitelisted IP addresses as string representations.
     */
    getAllowedIPs(){
        return this._allowedIPs;
    }

    /**
     * Adds one IP address to the IP blacklist, this method is chainable.
     *
     * @param {string} ip A string representation fo the IP address.
     *
     * @returns {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid IP address is given.
     */
    addDeniedIP(ip){
        if ( ip === '' || typeof ip !== 'string' ){
            throw new InvalidArgumentException('Invalid IP address.', 1);
        }
        this._deniedIPs.add(ip);
        return this;
    }

    /**
     * Adds one or more IP addresses to the IP blacklist, this method is chainable.
     *
     * @param {string[]} ips An array containing the IP addresses to add as string representation.
     *
     * @return {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    addDeniedIPs(ips){
        if ( !Array.isArray(ips) ){
            throw new InvalidArgumentException('Invalid IP address array.', 1);
        }
        const length = ips.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( ips[i] !== '' && typeof ips[i] === 'string' ){
                this._deniedIPs.add(ips[i]);
            }
        }
        return this;
    }

    /**
     * Removes one IP address from the IP blacklist, this method is chainable.
     *
     * @param {string} ip A string representation of the IP address to remove.
     *
     * @return {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid IP address is given.
     */
    removeDeniedIP(ip){
        if ( ip === '' || typeof ip !== 'string' ){
            throw new InvalidArgumentException('Invalid IP address.', 1);
        }
        this._deniedIPs.delete(ip);
        return this;
    }

    /**
     * Removes one or more IP addresses from the IP blacklist, this method is chainable.
     *
     * @param {string[]} ips An array containing the IP addresses to remove from the blacklist.
     *
     * @return {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    removeDeniedIPs(ips){
        if ( !Array.isArray(ips) ){
            throw new InvalidArgumentException('Invalid IP address array.', 1);
        }
        const length = ips.length;
        for ( let i = 0 ; i < length ; i++ ){
            this._deniedIPs.delete(ips[i]);
        }
        return this;
    }

    /**
     * Sets the blacklisted IP addresses, this method is chainable.
     *
     * @param {string[]} ips An array containing the IP addresses to add to the blacklist.
     *
     * @return {IPFilterInterceptor}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setDeniedIPs(ips){
        if ( !Array.isArray(ips) ){
            throw new InvalidArgumentException('Invalid IP address array.', 1);
        }
        this.dropDeniedIPs().addDeniedIPs(ips);
        return this;
    }

    /**
     * Removes all the IP addresses from the blacklist, this method is chainable.
     *
     * @return {IPFilterInterceptor}
     */
    dropDeniedIPs(){
        this._deniedIPs = new Set();
        return this;
    }

    /**
     * Returns all the IP addresses contained in the IP blacklist.
     *
     * @return {Set<string>} A set containing the IP addresses as string representation.
     */
    getDeniedIPs(){
        return this._deniedIPs;
    }

    /**
     * Sets if client connections must be allowed only to those IP addresses that have been defined in the whitelist, this method is chainable.
     *
     * @param allowedOnly If set to "true" connections will be accepted only by clients having as IP an address defined in the whitelist, otherwise to all those have an IP address not defined in the blacklist.
     *
     * @return {IPFilterInterceptor}
     */
    setAllowedOnly(allowedOnly){
        this._allowedOnly = allowedOnly === true;
        return this;
    }

    /**
     * Returns if requests will be allowed only to whitelisted IPs.
     *
     * @return {boolean}
     */
    getAllowedOnly(){
        return this._allowedOnly === true;
    }
}

module.exports = IPFilterInterceptor;
