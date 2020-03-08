'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const UploadedFile = require('../../Types/UploadedFile');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks that a file's extension is contained in a given list.
 */
class ExtensionsValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     */
    constructor(params = null) {
        super();

        /**
         * @type {string[]} _extensions An array of strings containing the accepted file extensions.
         *
         * @protected
         */
        this._extensions = [];

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('No extension given.', 1);
        }
        this._extensions = params;
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
        return value instanceof UploadedFile && this._extensions.indexOf(value.getExtension()) >= 0;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage(){
        return '';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(ExtensionsValidationRule, 'RULE_NAME', {
    value: 'extensions',
    writable: false
});

module.exports = ExtensionsValidationRule;
