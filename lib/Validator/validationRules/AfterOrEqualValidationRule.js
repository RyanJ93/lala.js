'use strict';

// Including Lala's modules.
const DateBasedValidationRule = require('./bases/DateBasedValidationRule');

/**
 * Validate a date fields checking that it's a valid date and that it's more recent or equal than a given one.
 */
class AfterOrEqualValidationRule extends DateBasedValidationRule {
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
        return !isNaN(timestamp) && ( new Date(timestamp) ) >= this._date;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must contain a valid date that must be more recent or equal to ' + this._date + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(AfterOrEqualValidationRule, 'RULE_NAME', {
    value: 'afterOrEqual',
    writable: false
});

module.exports = AfterOrEqualValidationRule;
