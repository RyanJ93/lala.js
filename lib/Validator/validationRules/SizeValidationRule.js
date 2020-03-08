'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const UploadedFile = require('../../Types/UploadedFile');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that checks the value size according to a given reference size and comparison mode.
 */
class SizeValidationRule extends ValidationRule {
    /**
     * Compares the given size with the one defined according to the comparison mode defined.
     *
     * @param {number} size An integer number greater or equal than zero representing the size to compare.
     *
     * @returns {boolean} A boolean value representing he result of the comparison.
     *
     * @protected
     */
    _compareSize(size){
        switch ( this._comparisonMode ){
            case 'eq': {
                return size === this._size;
            }
            case 'gt': {
                return size > this._size;
            }
            case 'gte': {
                return size >= this._size;
            }
            case 'lt': {
                return size < this._size;
            }
            case 'lte': {
                return size <= this._size;
            }
        }
    }

    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid size is given.
     * @throws {InvalidArgumentException} If an invalid or unsupported comparison mode is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {number} [_size=0] An integer number greater or equal than zero representing the size to compare.
         *
         * @protected
         */
        this._size = 0;

        /**
         * @type {string} [_comparisonMode="eq"] A string containing the comparison mode to use.
         *
         * @protected
         */
        this._comparisonMode = 'eq';

        if ( params === null || params.length === 0 ){
            throw new InvalidArgumentException('Invalid size.', 1);
        }
        const size = parseInt(params[0]);
        if ( isNaN(size) || size < 0 ){
            throw new InvalidArgumentException('Invalid size.', 1);
        }
        this._size = size;
        if ( params.length > 1 ){
            if ( SizeValidationRule.COMPARE_MODES.indexOf(params[1]) === -1 ){
                throw new InvalidArgumentException('Invalid comparison mode.', 2);
            }
            this._comparisonMode = params[1];
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
        switch ( typeof value ){
            case 'string': {
                return this._compareSize(value.length);
            }
            case 'number':
            case 'bigint': {
                return this._compareSize(value);
            }
            case 'boolean': {
                return this._compareSize(1);
            }
            case 'object': {
                if ( Array.isArray(value) ){
                    return this._compareSize(value.length);
                }else if ( value instanceof UploadedFile ){
                    return this._compareSize(value.getSize());
                }else{
                    return false;
                }
            }
            default: {
                return false;
            }
        }
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage(){
        let attribute;
        switch ( this._comparisonMode ){
            case 'eq': {
                attribute = 'equal';
            }break;
            case 'gt': {
                attribute = 'greater';
            }break;
            case 'gte': {
                attribute = 'greater or equal';
            }break;
            case 'lt': {
                attribute = 'lower';
            }break;
            case 'lte': {
                attribute = 'lower or equal';
            }break;
        }
        return 'Field {fieldName} size must be ' + attribute + ' than ' + this._size + '.';
    }
}

/**
 * Defines all the comparison modes supported by this validation rule.
 *
 * @enum {string[]} COMPARE_MODES
 * @readonly
 */
Object.defineProperty(SizeValidationRule, 'COMPARE_MODES', {
    value: ['eq', 'gt', 'gte', 'lt', 'lte'],
    writable: false
});

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(SizeValidationRule, 'RULE_NAME', {
    value: 'size',
    writable: false
});

module.exports = SizeValidationRule;
