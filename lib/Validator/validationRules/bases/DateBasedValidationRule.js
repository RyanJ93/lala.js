'use strict';

// Including Lala's modules.
const ValidationRule = require('../ValidationRule');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Allows to implements rules to validate dates.
 *
 * @abstract
 */
class DateBasedValidationRule extends ValidationRule {
    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid date has been passed as rule parameter.
     */
    constructor(params = null) {
        super(params);

        /**
         * @type {?Date} [_date] The date to compare to the one to validate.
         *
         * @protected
         */
        this._date = null;

        const date = this._params.length > 0 && typeof this._params[0] === 'string' ? Date.parse(this._params[0]) : NaN;
        if ( isNaN(date) ){
            throw new InvalidArgumentException('Invalid compare date.', 1);
        }
        this._date = new Date(date);
    }
}

module.exports = DateBasedValidationRule;
