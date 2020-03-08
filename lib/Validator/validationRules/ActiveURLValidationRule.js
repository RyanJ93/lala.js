'use strict';

// Including native modules.
const url = require('url');

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const DNSUtils = require('../../Utils/DNSUtils');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Implements the validation rule that allows to check if a given URL is valid and existing.
 */
class ActiveURLValidationRule extends ValidationRule {
    /**
     * Returns if this validation rule runs asynchronously or not.
     *
     * @return {boolean} Returns "true" as this validation rule runs in asynchronous way.
     */
    static isAsync(){
        return true;
    }

    /**
     * The class constructor.
     *
     * @param {?string[]} [params] An array of strings containing some additional parameters the validation should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If an invalid DNS query timeout is given.
     */
    constructor(params) {
        super(params);

        /**
         * @type {?number} An integer number greater than zero representing the DNS query timeout, if null no timeout will be applied.
         *
         * @protected
         */
        this._timeout = null;

        if ( params !== null && params.length > 0 ){
            const timeout = parseInt(params[0]);
            if ( isNaN(timeout) || timeout <= 0 ){
                throw new InvalidArgumentException('Invalid timeout value.', 1);
            }
            this._timeout = timeout;
        }
    }

    /**
     * Validates a given value.
     *
     * @param {*} value The value to validate, usually a string, however, no type validation is performed allowing to pass an arbitrary value.
     * @param {Validator} validator An instance of the "Validator" class representing the validator this rule is used in.
     * @param {Object.<string, *>} params An object containing all the parameters being validated by the validator this rule is used in.
     *
     * @returns {Promise<boolean>} If validation passes will be returned "true".
     *
     * @async
     */
    async validate(value, validator, params){
        // Validate and get the the domain name out of the given URL.
        const components = url.parse(value);
        let valid = components.hostname !== '';
        if ( valid ){
            // Resolve the domain name then check if there is at least one record of type A (IPv4) or AAAA (IPv6).
            const records = await DNSUtils.resolve(components.hostname, ['A', 'AAAA'], this._timeout);
            valid = records.length > 0;
        }
        return valid;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage(){
        return 'Field {fieldName} must contain a valid and existing URL.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(ActiveURLValidationRule, 'RULE_NAME', {
    value: 'activeURL',
    writable: false
});

module.exports = ActiveURLValidationRule;
