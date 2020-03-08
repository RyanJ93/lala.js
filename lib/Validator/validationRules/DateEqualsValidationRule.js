'use strict';

// Including Lala's modules.
const DateBasedValidationRule = require('./bases/DateBasedValidationRule');

/**
 * Implements the validation rule that checks that a field contains a valid date matching a given one.
 */
class DateEqualsValidationRule extends DateBasedValidationRule {
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
        const timestamp = Date.parse(value);
        return !isNaN(timestamp) && timestamp === this._date.getTime();
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must contain a valid date that is equivalent to ' + this._date + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(DateEqualsValidationRule, 'RULE_NAME', {
    value: 'dateEquals',
    writable: false
});

module.exports = DateEqualsValidationRule;
