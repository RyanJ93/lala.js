'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');

/**
 * Implements validation for checkboxes and other boolean fields that are required to be set "true".
 */
class AcceptedValidationRule extends ValidationRule {
    /**
     * Validates a given value.
     *
     * @param {*} value The value to validate, usually a string, however, no type validation is performed allowing to pass an arbitrary value.
     * @param {Validator} validator An instance of the "Validator" class representing the validator this rule is used in.
     * @param {Object.<string, *>} params An object containing all the parameters being validated by the validator this rule is used in.
     *
     * @returns {boolean} If validation passes will be returned "true".
     */
    validate(value, validator, params){
        return value === '1' || value === 'on' || value === 'yes' || value === 'true';
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage(){
        return 'Field {fieldName} must be checked.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(AcceptedValidationRule, 'RULE_NAME', {
    value: 'accepted',
    writable: false
});

module.exports = AcceptedValidationRule;
