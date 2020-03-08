'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    NotCallableException,
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Allows to implement validation rules.
 *
 * @abstract
 */
class ValidationRule {
    /**
     * Returns if this validation rule runs asynchronously or not.
     *
     * @return {boolean} If this validation rule is meant to be executed asynchronously will be returned "true".
     */
    static isAsync(){
        return false;
    }

    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(params = null) {
        /**
         * @param {string[]} _params An array of strings containing some additional parameters the validation should take care of.
         *
         * @protected
         */
        this._params = params === null ? [] : params;

        if ( params !== null && !Array.isArray(params) ){
            throw new InvalidArgumentException('Invalid rule parameters.', 1);
        }

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'ValidationRule' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
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
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    validate(value, validator, params){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
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

module.exports = ValidationRule;
