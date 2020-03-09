'use strict';

// Including native modules.
const url = require('url');

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');

/**
 * Implements the validation rule that check if a field contains a valid URL.
 */
class URLValidationRule extends ValidationRule {
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
        let valid = value !== '' && typeof value === 'string';
        if ( valid ){
            const result = url.parse(value);
            if ( result.hostname === '' ){
                valid = false;
            }
        }
        return valid;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be a valid URL.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(URLValidationRule, 'RULE_NAME', {
    value: 'URL',
    writable: false
});

module.exports = URLValidationRule;
