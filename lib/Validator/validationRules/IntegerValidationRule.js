'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that allows to check if a given value is a valid integer number representation.
 */
class IntegerValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid number radix is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {number} A number (from 2 to 36) that represents the numeral system to be used.
         *
         * @protected
         */
        this._radix = 10;

        if ( params !== null && params.length > 0 ){
            this._radix = parseInt(params[0]);
            if ( isNaN(this._radix) || this._radix < 2 || this._radix > 36 ){
                throw new InvalidArgumentException('Invalid radix.', 1);
            }
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
        return !isNaN(parseInt(value, this._radix));
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must contains a valid integer number.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(IntegerValidationRule, 'RULE_NAME', {
    value: 'integer',
    writable: false
});

/**
 * @constant Contains some additional names this validation rule should be available as.
 *
 * @type {string[]}
 * @default
 */
Object.defineProperty(IntegerValidationRule, 'ALIASES', {
    value: ['int'],
    writable: false
});

module.exports = IntegerValidationRule;
