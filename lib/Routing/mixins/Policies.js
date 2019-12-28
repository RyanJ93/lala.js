'use strict';

// Including Lala's modules.
const Mixin = require('../../Support/Mixin');
const Policy = require('../Policy');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Provides policies management capabilities.
 *
 * @mixin
 */
class Policies extends Mixin {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        /**
         * @type {Map<string, Policy>} _policies A map containing all the policies defined and having as key an unique name for the policy and as value an instance of the class that implements the policy.
         *
         * @protected
         */
        this._policies = new Map();
    }

    /**
     * Adds a policy to the list of all the policy to execute in order to establish if currently logged in user can access to this route, this method is chainable.
     *
     * @param {string} name A string containing an unique name associated to this policy.
     * @param {Policy} policy An instance of the class that implements the policy.
     *
     * @returns {Policies}
     *
     * @throws {InvalidArgumentException} If an invalid policy name is given.
     * @throws {InvalidArgumentException} If an invalid policy implementation object is given.
     */
    addPolicy(name, policy){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid policy name.', 1);
        }
        if ( !( policy instanceof Policy ) ){
            throw new InvalidArgumentException('Invalid policy.', 2);
        }
        this._policies.set(name, policy);
        return this;
    }

    /**
     * Removes a policy from the list of all the policies to execute by its unique associated name, this method is chainable.
     *
     * @param {string} name A string containing the unique name associated to this policy.
     *
     * @returns {Policies}
     *
     * @throws {InvalidArgumentException} If an invalid policy name is given.
     */
    removePolicy(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid policy name.', 1);
        }
        this._policies.delete(name);
        return this;
    }

    /**
     * Sets all the policies to execute, this method is chainable.
     *
     * @param {Map<string, Policy>} policies A map having as key a string containing the unique name associated to this policy and as value an instance of the class that implements the policy, it must extend the "Policy" class.
     *
     * @returns {Policies}
     *
     * @throws {InvalidArgumentException} If an invalid map containing the policies is given.
     */
    setPolicies(policies){
        if ( policies !== null && !( policies instanceof Map ) ){
            throw new InvalidArgumentException('Invalid policies.', 1);
        }
        // Drop current policies.
        this.dropPolicies();
        if ( policies !== null ){
            this._policies = policies;
        }
        return this;
    }

    /**
     * Sets all the policies to execute, this method is chainable.
     *
     * @param {Object.<string, Policy>} policies An object having as key a string containing the unique name associated to this policy and as value an instance of the class that implements the policy, it must extend the "Policy" class.
     *
     * @returns {Policies}
     *
     * @throws {InvalidArgumentException} If an invalid object containing the policies is given.
     */
    setPoliciesAsObject(policies){
        if ( policies !== null && typeof policies !== 'object' ){
            throw new InvalidArgumentException('Invalid policies.', 1);
        }
        // Drop current policies.
        this.dropPolicies();
        if ( policies !== null ){
            for ( const name in policies ){
                // Validate and add policies.
                if ( policies.hasOwnProperty(name) && name !== '' && typeof name === 'string' && policies[name] instanceof Policy ){
                    this._policies.set(name, policies[name]);
                }
            }
        }
        return this;
    }

    /**
     * Drops all the policies that have been defined, this method is chainable.
     *
     * @returns {Policies}
     */
    dropPolicies(){
        this._policies.clear();
        return this;
    }

    /**
     * Returns all the policies that have been defined.
     *
     * @returns {Map<string, Policy>} A map having as key a string containing the unique name associated to this policy and as value an instance of the class that implements the policy
     */
    getPolicies(){
        return this._policies;
    }

    /**
     * Returns all the policies that have been defined.
     *
     * @returns {Object.<string, Policy>} An object having as key a string containing the unique name associated to this policy and as value an instance of the class that implements the policy.
     */
    getPoliciesAsObject(){
        const policies = {};
        for ( const [name, policy] of this._policies ){
            policies[name] = policy;
        }
        return policies;
    }
}

module.exports = Policies;
