'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that allows to check if a value is contained in a list of possible options.
 */
class InValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an empty list of possible options is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {string[]} _expectedValues An array of strings containing the possible options for the values being validated.
         *
         * @protected
         */
        this._expectedValues = [];

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('No possible option given.', 1);
        }
        this._expectedValues = params;
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
        return this._expectedValues.indexOf(value) >= 0;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be one of the following: ' + this._expectedValues.join(', ') + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(InValidationRule, 'RULE_NAME', {
    value: 'in',
    writable: false
});

/**
 * @constant Contains some additional names this validation rule should be available as.
 *
 * @type {string[]}
 * @default
 */
Object.defineProperty(InValidationRule, 'ALIASES', {
    value: ['enum'],
    writable: false
});

module.exports = InValidationRule;
