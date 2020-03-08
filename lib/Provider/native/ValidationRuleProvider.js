'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const ValidationRuleRepository = require('../../Validator/ValidationRuleRepository');
const validationRules = require('../../Validator/validationRules');

/**
 * Installs all the built-in validation rules.
 */
class ValidationRuleProvider extends Provider {
    /**
     * Registers the built-in validation rules.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        for ( const rule in validationRules ){
            // Check if current validation rule name is defined.
            if ( validationRules.hasOwnProperty(rule) && validationRules[rule].hasOwnProperty('RULE_NAME') ){
                ValidationRuleRepository.register(validationRules[rule].RULE_NAME, validationRules[rule], true);
                // Check if more aliases have been defined for current rule.
                if ( validationRules[rule].hasOwnProperty('ALIASES') && Array.isArray(validationRules[rule].ALIASES) ){
                    const length = validationRules[rule].ALIASES.length;
                    // Register current validation rule for each defined alias.
                    for ( let i = 0 ; i < length ; i++ ){
                        ValidationRuleRepository.register(validationRules[rule].ALIASES[i], validationRules[rule], true);
                    }
                }
            }
        }
    }
}

module.exports = ValidationRuleProvider;
