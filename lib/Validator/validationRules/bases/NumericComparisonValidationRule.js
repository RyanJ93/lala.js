'use strict';

// Including Lala's modules.
const ValidationRule = require('../ValidationRule');
const {
    InvalidArgumentException,
    RuntimeException
} = require('../../../Exceptions');

/**
 * Allows to implement validation rules that require the value being validated to be compared to a numeric one.
 *
 * @abstract
 */
class NumericComparisonValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid compare value is given.
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(params){
        super(params);

        /**
         * @type {number} [_compareValue=NaN] A floating point number representing the value to compare with the value being validated.
         *
         * @protected
         */
        this._comparisonValue = NaN;

        const comparisonValue = Array.isArray(params) && params.length > 0 ? parseFloat(params[0]) : NaN;
        if ( isNaN(comparisonValue) ){
            throw new InvalidArgumentException('Invalid compare value.', 1);
        }
        this._comparisonValue = comparisonValue;
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'NumericComparisonValidationRule' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }
}

module.exports = NumericComparisonValidationRule;
