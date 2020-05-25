'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');

/**
 * Implements the validation rule that checks if a parameter exists.
 */
class RequiredValidationRule extends ValidationRule {
    /**
     * Checks if a given file exists and it's not empty.
     *
     * @param {*} value The value to check.
     *
     * @returns {boolean} If the given value is valid will be returned "true".
     *
     * @protected
     */
    static _isValid(value){
        return typeof value !== 'undefined' && value !== null && value !== '';
    }

    /**
     * Returns if this validation rule can be skipped if the field to validate is null, empty or undefined.
     *
     * @return {boolean} If this validation rule can be skipped will be returned "true".
     */
    static isSkippable(){
        return false;
    }

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
        return RequiredValidationRule._isValid(value);
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} is required.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(RequiredValidationRule, 'RULE_NAME', {
    value: 'required',
    writable: false
});

module.exports = RequiredValidationRule;
