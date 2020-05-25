'use strict';

// Including Lala's modules.
const FileValidationRule = require('./FileValidationRule');

/**
 * Implements the validation rule that checks if the given fields is a valid uploaded file and represents an image.
 */
class ImageValidationRule extends FileValidationRule {
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
        return super.validate(value, validator, params) && ImageValidationRule.IMAGE_MIME_TYPES.indexOf(value.getMimetype()) >= 0;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage() {
        return 'Field {fieldName} must be a valid uploaded image.';
    }
}

Object.defineProperty(ImageValidationRule, 'IMAGE_MIME_TYPES', {
    value: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/x-windows-bmp', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/apng', 'image/x-icon', 'image/tiff'],
    writable: false
});

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(ImageValidationRule, 'RULE_NAME', {
    value: 'image',
    writable: false
});

module.exports = ImageValidationRule;
