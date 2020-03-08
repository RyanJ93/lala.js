'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks that a field contains a different value than the one contained in an another given field.
 */
class DifferentValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If no value to check is given.
     */
    constructor(params = null) {
        super(params);

        /**
         * @type {?string} _compareValues A string containing the name of the field that contains the value to compare.
         *
         * @protected
         */
        this._comapreField = null;

        if ( params === null || params.length === 0 || params[0] === '' ){
            throw new InvalidArgumentException('Invalid field name.', 1);
        }
        this._comapreField = params[0];
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
        return ( typeof value === 'undefined' && typeof params[this._comapreField] === 'undefined' ) || value !== params[this._comapreField];
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be different by the field ' + this._comapreField + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(DifferentValidationRule, 'RULE_NAME', {
    value: 'different',
    writable: false
});

module.exports = DifferentValidationRule;
