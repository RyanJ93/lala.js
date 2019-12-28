'use strict';

// Including Lala's modules.
const {
    RuntimeException
} = require('../../Exceptions');

/**
 * @callback FirewallRuleImplementation THe callback function that implements the firewall rule.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 *
 * @returns {Promise<boolean>} If client request should continue "true" must be returned, otherwise client request will be blocked.
 *
 * @async
 */

/**
 * Allows to implements custom firewall rules.
 *
 * @abstract
 */
class FirewallRule {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor() {
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'FirewallRule' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {Map<string, FirewallRuleImplementation>} _checkpoints A map containing the callback functions to execute for each request processing step, step names are used as the entries key.
         *
         * @protected
         */
        this._checkpoints = new Map();
    }

    /**
     * Execute the callback function defined for a given checkpoint name.
     *
     * @param {string} checkpoint A string containing the name of the request processing checkpoint.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If client request processing can continue will be returned "true", otherwise "false" and client request should be immediately blocked.
     *
     * @async
     */
    async filter(checkpoint, request, response){
        let result = true;
        if ( this._checkpoints.has(checkpoint) ){
            const callback = this._checkpoints.get(checkpoint);
            if ( typeof callback === 'function' ){
                const consent = await callback(request, response);
                result = consent === true;
            }
        }
        return result;
    }
}

module.exports = FirewallRule;
