'use strict';

// Including Lala's modules.
const NumericComparisonValidationRule = require('./bases/NumericComparisonValidationRule');

/**
 * Implements the validation rule that allows to check if a number is greater or equal than a given one.
 */
class GTEValidationRule extends NumericComparisonValidationRule {
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
        const numericValue = parseFloat(value);
        return !isNaN(numericValue) && numericValue >= this._compareValue;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be greater or equal than ' + this._compareValue + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(GTEValidationRule, 'RULE_NAME', {
    value: 'gte',
    writable: false
});

module.exports = GTEValidationRule;
