'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');

/**
 * Implements the validation rule that checks if the value being validated is a number or a number representation.
 */
class NumericValidationRule extends ValidationRule {
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
        return !isNaN(value);
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be a valid number.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(NumericValidationRule, 'RULE_NAME', {
    value: 'numeric',
    writable: false
});

/**
 * @constant Contains some additional names this validation rule should be available as.
 *
 * @type {string[]}
 * @default
 */
Object.defineProperty(NumericValidationRule, 'ALIASES', {
    value: ['number'],
    writable: false
});

module.exports = NumericValidationRule;
