'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');

/**
 * Implements the validation rule that check if a field contains a valid boolean-like value.
 */
class BooleanValidationRule extends ValidationRule {
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
        let valid = typeof value === 'boolean' || value === 1 || value === 0 || value === '1' || value === '0';
        if ( !valid ){
            value = value.toLowerCase();
            valid = value === 'true' || value === 'false';
        }
        return valid;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be a valid boolean.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(BooleanValidationRule, 'RULE_NAME', {
    value: 'boolean',
    writable: false
});

module.exports = BooleanValidationRule;
