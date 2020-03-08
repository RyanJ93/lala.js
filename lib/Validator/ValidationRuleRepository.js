'use strict';

// Including Lala's modules.
const BaseRepository = require('../Repository/BaseRepository');
const ValidationRule = require('./validationRules/ValidationRule');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Allows to register new validation rules.
 */
class ValidationRuleRepository extends BaseRepository {
    /**
     * Registers a new validation rule.
     *
     * @param {string} name A string representing an unique name for the validation rule.
     * @param {ValidationRule} validationRule The validation rule to register, it must be the validation class, not the instance, and it must extend the "ValidationRule" class.
     * @param {boolean} [overwrite=false] If set to "true" it means that if an object has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid validation rule is given.
     * @throws {InvalidArgumentException} If another validation rule with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    static register(name, validationRule, overwrite = false){
        if ( !( validationRule.prototype instanceof ValidationRule ) ){
            throw new InvalidArgumentException('Invalid validation rule.', 1);
        }
        super.register(name, validationRule, 'com.lala.form.validationRule', overwrite);
    }

    /**
     * Removes a given validation rule.
     *
     * @param {string} name A string containing the name of the validation rule to remove.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.form.validationRule');
    }

    /**
     * Checks if a validation rule matching the given name has been registered or not.
     *
     * @param {string} name A string containing the name of the validation rule to check.
     *
     * @returns {boolean} If the validation rule has been registered and found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.form.validationRule');
    }

    /**
     * Returns the registered validation rule matching the given key.
     *
     * @param {string} name A string containing the name of the validation rule to return.
     *
     * @returns {ValidationRule} The validation rule matching the key, if no validation rule matching the given key is found will be returned "null".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.form.validationRule');
    }

    /**
     * Returns all the registered validation rules.
     *
     * @returns {Object.<string, ValidationRule>} An object having as key the object name and as value the validation rule itself.
     */
    static getAll(){
        return super.getAll('com.lala.form.validationRule');
    }
}

module.exports = ValidationRuleRepository;
