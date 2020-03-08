'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks that a given string start with one of the defined ones.
 */
class StartsWithValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If no valid prefix is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {string[]} _prefixes An array containing all the prefixes to lookup within the string being validated.
         *
         * @protected
         */
        this._prefixes = [];

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('No prefix given.', 1);
        }
        this._prefixes = params;
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
        const length = this._prefixes.length;
        let found = false, i = 0;
        if ( value !== '' && typeof value === 'string' ){
            // Lookup each of the defined prefix.
            while ( !found && i < length ){
                if ( value.indexOf(this._prefixes[i]) === 0 ){
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
        return 'Field {fieldName} must start with one of the following sequences: ' + this._prefixes.join(', ') + '.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(StartsWithValidationRule, 'RULE_NAME', {
    value: 'startsWith',
    writable: false
});

module.exports = StartsWithValidationRule;
