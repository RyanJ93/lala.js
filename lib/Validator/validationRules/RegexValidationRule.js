'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const StringUtils = require('../../Utils/StringUtils');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that allows to execute an arbitrary regular expression to validate the input data.
 */
class RegexValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid regex is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {RegExp} _regex An instance of the class "RegExp" representing the regex used during the validation process.
         *
         * @protected
         */
        this._regex = null;

        if ( params !== null && Array.isArray(params) && params.length > 0 ){
            try{
                this._regex = StringUtils.toRegExp(params[0]);
            }catch{
                throw new InvalidArgumentException('Invalid regex.', 1);
            }
        }
        if ( this._regex === null ){
            throw new InvalidArgumentException('Invalid regex.', 1);
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
    validate(value, validator, params) {
        return this._regex.test(value);
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must match the following pattern: ' + this._regex.toString();
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(RegexValidationRule, 'RULE_NAME', {
    value: 'regex',
    writable: false
});

module.exports = RegexValidationRule;