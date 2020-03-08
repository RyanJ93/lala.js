'use strict';

// Including Lala's modules.
const AlphaValidationRule = require('./AlphaValidationRule');

/**
 * Validate a value checking that it contains alphanumeric characters only.
 */
class AlphaNumericValidationRule extends AlphaValidationRule {
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
        return value !== '' && /^[a-zA-Z0-9]*$/.test(value);
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'The field {fieldName} accepts alphanumeric characters only.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(AlphaNumericValidationRule, 'RULE_NAME', {
    value: 'alphanumeric',
    writable: false
});

module.exports = AlphaNumericValidationRule;
