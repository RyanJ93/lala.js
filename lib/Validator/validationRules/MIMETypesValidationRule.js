'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const UploadedFile = require('../../Types/UploadedFile');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks if the MIME type of the file being validated is contained in a given list.
 */
class MIMETypesValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If no allowed MIME type is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {string[]} _mimeTypes An array of strings containing the allowed MIME types for the file being validated.
         *
         * @protected
         */
        this._mimeTypes = [];

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('No MIME type defined.', 1);
        }
        this._mimeTypes = params;
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
        return value instanceof UploadedFile && this._mimeTypes.indexOf(value.getMimetype()) >= 0;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage(){
        return 'Field {fieldName} must be ';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(MIMETypesValidationRule, 'RULE_NAME', {
    value: 'MIMETypes',
    writable: false
});

module.exports = MIMETypesValidationRule;
