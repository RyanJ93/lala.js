'use strict';

// Including Lala's modules.
const ValidationRule = require('./ValidationRule');
const EmailAddressTester = require('../../Utils/EmailAddressTester');
const {
    InvalidArgumentException,
    RuntimeException
} = require('../../Exceptions');

/**
 * Implements validation rule to check that an email address exists.
 */
class EmailExistsValidationRule extends ValidationRule {
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
     * @throws {InvalidArgumentException} If an invalid DNS resolution timeout is given.
     * @throws {InvalidArgumentException} If an invalid SMTP communication timeout is given.
     */
    constructor(params = null) {
        super(params);

        /**
         * @type {number} [_DNSResolutionTimeout=3] An integer value greater or equal than zero representing the timeout to apply to the email domain's DNS resolution.
         *
         * @protected
         */
        this._DNSResolutionTimeout = params !== null && params.length > 0 ? parseInt(params[0]) : 3;

        /**
         * @type {number} [_probingTimeout=3] An integer value greater or equal than zero representing the timeout to use during SMTP message exchange.
         *
         * @protected
         */
        this._probingTimeout = params !== null && params.length > 1 ? parseInt(params[1]) : 3;

        if ( isNaN(this._DNSResolutionTimeout) || this._DNSResolutionTimeout < 0 ){
            throw new InvalidArgumentException('Invalid DNS resolution timeout.', 1);
        }
        if ( isNaN(this._probingTimeout) || this._probingTimeout < 0 ){
            throw new InvalidArgumentException('Invalid SMTP communication timeout.', 2);
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
     * @throws {RuntimeException} If an error occurs during email address testing.
     *
     * @async
     */
    async validate(value, validator, params){
        let valid = false;
        if ( value !== '' && typeof value === 'string' ){
            try{
                const emailAddressTester = new EmailAddressTester(value);
                emailAddressTester.setDNSResolutionTimeout(this._DNSResolutionTimeout).setProbingTimeout(this._probingTimeout);
                valid = await emailAddressTester.test();
            }catch(ex){
                if ( ex instanceof RuntimeException && ex.getCode() === 3 ){
                    valid = true;
                }else{
                    throw new RuntimeException('An error occurred wile testing the email address.', 1, ex);
                }
            }
        }
        return valid;
    }

    /**
     * Returns the error message that should be returned whenever this validation rule fails.
     *
     * @returns {string} A string containing the error message.
     */
    getMessage(){
        return 'Field {fieldName} must contains a valid and existing email address.';
    }
}

/**
 * @constant Contains the name this rule should be registered with.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(EmailExistsValidationRule, 'RULE_NAME', {
    value: 'emailExists',
    writable: false
});

module.exports = EmailExistsValidationRule;
