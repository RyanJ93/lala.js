'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks that a given string ends with one of the defined ones.
 */
class EndsWithValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If no valid suffix is given.
     */
    constructor(params){
        super(params);

        /**
         * @type {string[]} _suffixes An array of strings containing all the sequences the input to validate can end with.
         *
         * @protected
         */
        this._suffixes = [];

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('No valid suffix given.', 1);
        }
        this._suffixes = params;
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
        const length = this._suffixes.length, valueLength = value.length;
        let found = false, i = 0;
        if ( value !== '' && typeof value === 'string' ){
            // Lookup each of the defined suffix.
            while ( !found && i < length ){
                // Compute the position current suffix must be found at in order to be a suffix of the string being validated.
                const index = valueLength - this._suffixes[i].length;
                // Check if current suffix can be a suffix for current value and check if it's found within the string.
                if ( index > 0 && value.indexOf(this._suffixes[i]) === index ){
                    found = true;
                }
                i++;
            }
        }
        return found;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must end with one of the following sequences: ' + this._suffixes.join(', ') + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(EndsWithValidationRule, 'RULE_NAME', {
    value: 'endsWith',
    writable: false
});

module.exports = EndsWithValidationRule;
