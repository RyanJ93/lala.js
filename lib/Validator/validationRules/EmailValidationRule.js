'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const EmailUtils = require('../../Utils/EmailUtils');

/**
 * Implements the validation rule that checks if a field contains a valid email address.
 */
class EmailValidationRule extends ValidationRule {
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
        return typeof value === 'string' && EmailUtils.validate(value);
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must contains a valid email address.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(EmailValidationRule, 'RULE_NAME', {
    value: 'email',
    writable: false
});

module.exports = EmailValidationRule;
