'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks if the value being validated is the same of another one.
 */
class SameValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid DNS resolution timeout is given.
     * @throws {InvalidArgumentException} If an invalid SMTP communication timeout is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {?string} [_comparisonValue] A string containing the value to compare.
         *
         * @protected
         */
        this._comparisonValue = null;

        if ( params === null || params.length === 0 || params[0] === '' ){
            throw new InvalidArgumentException('Invalid comparison value.', 1);
        }
        this._comparisonValue = params[0];
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
        return value === this._comparisonValue;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must match the following value: ' + this._comparisonValue;
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(SameValidationRule, 'RULE_NAME', {
    value: 'same',
    writable: false
});

module.exports = SameValidationRule;
