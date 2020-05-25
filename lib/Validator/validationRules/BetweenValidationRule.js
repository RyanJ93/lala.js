'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks a field's value is contained between a given numeric range.
 */
class BetweenValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid minimum value is given.
     * @throws {InvalidArgumentException} If an invalid maximum value is given.
     */
    constructor(params = null) {
        super(params);

        /**
         * @type {number} _min A number representing the value the fields must be greater or equal than.
         *
         * @protected
         */
        this._min = params.length > 0 ? parseFloat(params[0]) : NaN;

        /**
         * @type {number} _max A number representing the value the field must be lower or equal than.
         *
         * @protected
         */
        this._max = params.length > 1 ? parseFloat(params[1]) : NaN;

        if ( isNaN(this._min) || this._min > this._max ){
            throw new InvalidArgumentException('Invalid minimum value.', 1);
        }
        if ( isNaN(this._max) ){
            throw new InvalidArgumentException('Invalid maximum value.', 2);
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
        return !isNaN(number) && number >= this._min && number <= this._max;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be a numeric value between ' + this._min + ' and ' + this._max + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(BetweenValidationRule, 'RULE_NAME', {
    value: 'between',
    writable: false
});

module.exports = BetweenValidationRule;
