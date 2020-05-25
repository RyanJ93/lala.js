'use strict';

// Including Lala's modules.
const RequiredValidationRule = require('./RequiredValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks if a parameter exists as long as a given field is equal to a given value.
 */
class RequiredIfValidationRule extends RequiredValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid field name is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {?string} [_comparisonField] A string containing the name of the field to compare.
         *
         * @protected
         */
        this._comparisonField = null;

        /**
         * @type {string} [_comparisonValue=""] A string containing the value that the file to compare must assume in order to check the presence of the field being validated.
         *
         * @protected
         */
        this._comparisonValue = '';

        if ( params === null || !Array.isArray(params) || params.length === 0 || params[0] === '' ){
            throw new InvalidArgumentException('Invalid field name.', 1);
        }
        this._comparisonField = params[0];
        if ( params.length > 1 ){
            this._comparisonValue = params[1];
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
        let valid = true;
        if ( params.hasOwnProperty(this._comparisonField) && params[this._comparisonField] === this._comparisonValue ){
            valid = super.validate(value, validator, params);
        }
        return valid;
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(RequiredIfValidationRule, 'RULE_NAME', {
    value: 'requiredIf',
    writable: false
});

module.exports = RequiredIfValidationRule;
