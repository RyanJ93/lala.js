'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements validation rule to ensure a field contains digits only.
 */
class DigitsValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid length is given.
     */
    constructor(params = null) {
        super(params);

        /**
         * @type {number} [_length=0] An integer number greater or equal than zero representing the maximum length allowed for the field value, if zero no check is performed.
         *
         * @protected
         */
        this._length = Array.isArray(params) && params.length > 0 ? parseInt(params[0]) : 0;

        if ( isNaN(this._length) ){
            throw new InvalidArgumentException('Invalid length.', 1);
        }
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
        const number = parseFloat(value);
        return !isNaN(number) && ( this._length === 0 || value.length <= this._length );
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        let message = 'Field {fieldName} must not contain a numeric value';
        if ( this._length > 0 ){
            message += ' having maximum length ' + this._length + ' characters';
        }
        return message + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(DigitsValidationRule, 'RULE_NAME', {
    value: 'digits',
    writable: false
});

module.exports = DigitsValidationRule;
