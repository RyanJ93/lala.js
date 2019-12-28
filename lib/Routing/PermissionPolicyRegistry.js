'use strict';

// Including Lala's modules.
const Policy = require('./Policy');
const {
    InvalidArgumentException,
    DuplicateEntryException
} = require('../Exceptions');

/**
 * @typedef {Object} PermissionPolicyRegistryRepository The object where the policies associated to the hierarchy of permissions are stored in.
 *
 * @property {Map<string, PermissionPolicyRegistryRepository>} permissions A map having as key the identifier of current prefix and as value another node (an object like this) containing the policies for inner levels.
 * @property {Map<string, Policy>} policies A map containing all the policies associated to this level and having as key the unique policy name and as value an instance of the class that implements the policy.
 */

/**
 * Allows to associate policies to permissions, when permissions are assigned to routes, associated policies will be executed as well as route associated ones.
 */
class PermissionPolicyRegistry {
    /**
     * Returns all the policies stored in a given node and in all the inner ones.
     *
     * @param {PermissionPolicyRegistryRepository} container An object representing a node taken from the storage hierarchy.
     *
     * @returns {Policy[]} An array containing all the policies found as instances of the classes that implement them and extending the "Policy" class.
     *
     * @protected
     */
    static _getInnerPolicies(container){
        let policies = [];
        if ( container.permissions.size > 0 ){
            // Get all the inner nodes.
            const subLevels = container.permissions.values();
            for ( const level of subLevels ){
                if ( level.policies !== null ){
                    // Extract all the policies from current node.
                    policies = policies.concat(Array.from(level.policies.values()));
                }
                // Extract all the policies from current node's inner levels.
                const subPolicies = PermissionPolicyRegistry._getInnerPolicies(level);
                // Append all the policies found to the array to return.
                policies = policies.concat(subPolicies);
            }
        }
        return policies;
    }

    /**
     * @type {PermissionPolicyRegistryRepository} repository An object that stores all the policies structuring them in order to enhance look up operations.
     *
     * @private
     */
    static #repository = {
        permissions: new Map(),
        policies: null
    };

    /**
     * Associates a policy to a given permission.
     *
     * @param {string} permission A string representing the identifier of the permission the given policy will be associated to.
     * @param {string} name A string containing the unique name of the policy.
     * @param {Policy} policy An instance of the class that implements the policy, it must extend the "Policy" abstract class.
     * @param {boolean} [overwrite=false] If set to "true" and if a policy having the same name has already bee defined for the given permission it will be overwritten, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     * @throws {InvalidArgumentException} If an invalid policy name is given.
     * @throws {InvalidArgumentException} If an invalid policy is given.
     * @throws {DuplicateEntryException} If a policy having the same name has already been defined for the given permission and the "overwrite" parameter wasn't set to "true".
     */
    static associate(permission, name, policy, overwrite = false){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid policy name.', 2);
        }
        if ( !( policy instanceof Policy ) ){
            throw new InvalidArgumentException('Invalid policy.', 3);
        }
        // Get all the hierarchy levels of the given string, for instance: a.b.c => [a, b, c].
        const components = permission.split('.');
        const length = components.length;
        // Get the first hierarchy node.
        let reference = PermissionPolicyRegistry.#repository;
        for ( let i = 0 ; i < length ; i++ ){
            // Get the more inner hierarchy node.
            let newReference = reference.permissions.get(components[i]);
            if ( typeof newReference === 'undefined' ){
                // If that node doesn't exist, create it.
                newReference = {
                    permissions: new Map(),
                    policies: null
                };
                reference.permissions.set(components[i], newReference);
            }
            reference = newReference;
        }
        if ( reference.policies === null ){
            reference.policies = new Map();
        }
        if ( overwrite !== true && reference.policies.has(name) ){
            throw new DuplicateEntryException('Duplicate policy found.', 4);
        }
        reference.policies.set(name, policy);
    }

    /**
     * Disassociates a policy from a given permission.
     *
     * @param {string} permission A string representing the identifier of the permission the given policy will be disassociated from.
     * @param {string} name A string containing the unique name of the policy to disassociate.
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     * @throws {InvalidArgumentException} If an invalid policy name is given.
     */
    static disassociate(permission, name){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid policy name.', 2);
        }
        // Get all the hierarchy levels of the given string, for instance: a.b.c => [a, b, c].
        const components = permission.split('.');
        let length = components.length, i = 0, reference = PermissionPolicyRegistry.#repository;
        // Loop until reach the end of the hierarchy, then get last node.
        while ( i < length && typeof reference !== 'undefined' ){
            reference = reference.permissions.get(components[i]);
            i++;
        }
        if ( typeof reference !== 'undefined' && reference.policies !== null ){
            // The node tht corresponds to the last level of the permission string has been found, delete the given policy from it.
            reference.policies.delete(name);
            if ( reference.policies.size === 0 ){
                reference.policies = null;
            }
        }
    }

    /**
     * Associates the given policies to a permission.
     *
     * @param {string} permission A string representing the identifier of the permission the given policies will be associated to.
     * @param {?Map<string, Policy>} policies A map containing as key the unique name of the policy and as value the instance of the class that implements the policy, it must extend the "Policy" abstract class.
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     * @throws {InvalidArgumentException} If the given map containing the policies is not valid.
     */
    static associatePolicies(permission, policies){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        if ( policies !== null && !( typeof policies instanceof Map ) ){
            throw new InvalidArgumentException('Invalid policies.', 2);
        }
        // Drops all the policies that have been assigned to the given permission.
        this.drop(permission);
        if ( policies !== null ){
            // Loop all the given policies and then assign it to the given permission.
            for ( const [name, policy] of policies ){
                PermissionPolicyRegistry.associate(permission, name, policy);
            }
        }
    }

    /**
     * Associates multiple policies, given as an object, to a permission.
     *
     * @param {string} permission A string representing the identifier of the permission the given policies will be associated to.
     * @param {Object.<string, Policy>} policies
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     * @throws {InvalidArgumentException}
     */
    static associatePoliciesAsObject(permission, policies){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        if ( typeof policies !== 'object' ){
            throw new InvalidArgumentException('Invalid policies.', 2);
        }
        // Drops all the policies that have been assigned to the given permission.
        this.drop(permission);
        if ( policies !== null ){
            // Loop all the given policies and then assign it to the given permission.
            for ( const name in policies ){
                if ( policies.hasOwnProperty(name) ){
                    PermissionPolicyRegistry.associate(permission, name, policies[name]);
                }
            }
        }
    }

    /**
     * Disassociates all the policies that have been associated to a given permission.
     *
     * @param {string} permission A string representing the identifier of the permission
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    static drop(permission){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        // Get all the hierarchy levels of the given string, for instance: a.b.c => [a, b, c].
        const components = permission.split('.');
        let length = components.length, i = 0, reference = PermissionPolicyRegistry.#repository;
        // Loop until reach the end of the hierarchy, then get last node.
        while ( i < length && typeof reference !== 'undefined' ){
            reference = reference.permissions.get(components[i]);
            i++;
        }
        if ( typeof reference !== 'undefined' ){
            // The node tht corresponds to the last level of the permission string has been found, drop all the policies assigned to this node.
            reference.policies = null;
        }
    }

    /**
     * Disassociates all the policies that have been associated to any permission.
     */
    static dropAll(){
        PermissionPolicyRegistry.#repository.permissions.clear();
        PermissionPolicyRegistry.#repository.policies = null;
    }

    /**
     * Returns all the policies defined for a given permission, including the ones containing a wildcard character.
     *
     * @param {string} permission A string representing the identifier of the permission.
     *
     * @returns {Set<Policy>} A set containing all the policies found.
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    static get(permission){
        if ( permission === '' || typeof permission !== 'string' ){
            throw new InvalidArgumentException('Invalid permission.', 1);
        }
        // Get all the hierarchy levels of the given string, for instance: a.b.c => [a, b, c].
        const components = permission.split('.');
        const length = components.length;
        let reference = PermissionPolicyRegistry.#repository, i = 0, wildcard = false, policies = [], additionalPermits = [];
        // Look up the node according to the given permission string.
        while ( !wildcard && i < length && typeof reference !== 'undefined' ){
            if ( components[i] === '*' ){
                wildcard = true;
            }else{
                // Get all the permissions that have been assigned to current node and lower ones.
                const additions = reference.permissions.get('*');
                if ( typeof additions !== 'undefined' ){
                    additionalPermits.push(additions);
                }
                // Switch to the inner node.
                reference = reference.permissions.get(components[i]);
                i++;
            }
        }
        if ( typeof reference !== 'undefined' ){
            // The node tht corresponds to the last level of the permission string has been found, get all the policies from it.
            policies = wildcard ? PermissionPolicyRegistry._getInnerPolicies(reference) : Array.from(reference.policies.values());
        }
        // Add all the policies of the nodes that have been encountered during first loop and that contains a wildcard.
        const additionalPermitsLength = additionalPermits.length;
        for ( let i = 0 ; i < additionalPermitsLength ; i++ ){
            if ( additionalPermits[i].policies !== null ){
                // Extract and add all the policies from current node.
                const additionalPolicies = Array.from(additionalPermits[i].policies.values());
                policies = policies.concat(additionalPolicies);
            }
            // Extract and add all the policies from inner nodes.
            const additionalPolicies = PermissionPolicyRegistry._getInnerPolicies(additionalPermits[i]);
            policies = policies.concat(additionalPolicies);
        }
        // Transform the generated array of policies into a set allowing to filter out duplicates.
        return new Set(policies);
    }

    /**
     * Returns all the policies defined for a given permission, including the ones containing a wildcard character.
     *
     * @param {string} permission A string representing the identifier of the permission.
     *
     * @returns {Policy[]} An array containing all the policies found.
     *
     * @throws {InvalidArgumentException} If an invalid permission identifier is given.
     */
    static getAsArray(permission){
        return Array.from(PermissionPolicyRegistry.get(permission));
    }
}

module.exports = PermissionPolicyRegistry;
