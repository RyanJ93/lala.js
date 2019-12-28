'use strict';

// Including Lala's modules.
const FirewallRule = require('./firewallRules/FirewallRule');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * The "Firewall" class allows to set up conditioning rules that allow to control the whole request flow, step by step.
 */
class Firewall {
    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {Set<FirewallRule>} _rules A set containing all the rules this firewall should take care of when processing client requests.
         *
         * @protected
         */
        this._rules = new Set();
    }

    /**
     * Adds a rule to the list of all the rules to execute, this method is chainable.
     *
     * @param {FirewallRule} rule A class representing a rule, note that it must extend the "FirewallRule" class.
     *
     * @returns {Firewall}
     *
     * @throws {InvalidArgumentException} If an invalid rule is given.
     */
    addRule(rule){
        if ( !( rule instanceof FirewallRule ) ){
            throw new InvalidArgumentException('Invalid rule.', 1);
        }
        this._rules.add(rule);
        return this;
    }

    /**
     * Removes a given rule from the list of all the rules to execute, this method is chainable.
     *
     * @param {FirewallRule} rule A class representing the rule to remove.
     *
     * @returns {Firewall}
     */
    removeRule(rule){
        this._rules.delete(rule);
        return this;
    }

    /**
     * Removes all the rules defined, this method is chainable.
     *
     * @returns {Firewall}
     */
    dropRules(){
        this._rules = new Set();
        return this;
    }

    /**
     * Processes all the rules for a given request processing phase.
     *
     * @param {string} checkpoint A string containing the name of the request processing phase being execute.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If given client request can continue according to executed rules will be returned "true", otherwise "false" or an exception could be thrown.
     *
     * @async
     */
    async process(checkpoint, request, response){
        let result = true;
        for ( const rule of this._rules ){
            const consent = await rule.filter(checkpoint, request, response);
            if ( !consent ){
                result = false;
                break;
            }
        }
        return result;
    }
}

module.exports = Firewall;
