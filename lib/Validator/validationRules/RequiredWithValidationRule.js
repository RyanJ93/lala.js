'use strict';

// Including Lala's modules.
const RequiredValidationRule = require('./RequiredValidationRule');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks if a parameter exists only if at least one of the given fields is present.
 */
class RequiredWithValidationRule extends RequiredValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid array of fields is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {string[]} _fields An array of strings containing the fields that must be present in order to check for the presence of the field being validated.
         *
         * @protected
         */
        this._fields = [];

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('No field name given.', 1);
        }
        this._fields = params;
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
        const length = this._fields.length;
        let compare = false, i = 0;
        // Check if every of the given field is present.
        while ( !compare && i < length ){
            if ( RequiredWithValidationRule._isValid(params[this._fields[i]]) ){
                compare = true;
            }
            i++;
        }
        return !compare || super.validate(value, validator, params);
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(RequiredWithValidationRule, 'RULE_NAME', {
    value: 'requiredWith',
    writable: false
});

module.exports = RequiredWithValidationRule;
