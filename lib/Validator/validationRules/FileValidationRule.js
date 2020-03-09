'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const UploadedFile = require('../../Types/UploadedFile');

/**
 * Implements the validation rule that checks if a fields is an uploaded file.
 */
class FileValidationRule extends ValidationRule {
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
        return value instanceof UploadedFile;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be an uploaded file.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(FileValidationRule, 'RULE_NAME', {
    value: 'file',
    writable: false
});

module.exports = FileValidationRule;
