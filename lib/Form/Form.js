'use strict';

// Including Lala's modules.
const Validator = require('../Validator/Validator');
const Typify = require('../Typify/Typify');
const Context = require('../Types/Context');
const {
    InvalidArgumentException,
    RuntimeException
} = require('../Exceptions');

/**
 * @typedef {Object} FieldMapping Contains the mapping attributes for a field.
 *
 * @property {?string} type A string containing the name of the type this field should be casted in.
 * @property {?string[]} validationRules An array of strings containing the validation rules to apply.
 * @property {?Object.<string, string>} messages An object containing the message to use for each validation rule.
 */

/**
 * Allows to implements forms, useful to validate and cast data from client-side requests.
 *
 * @abstract
 */
class Form {
    /**
     * Generates and returns an instance of the validator class that will be used in the validation process.
     *
     * @returns {Validator} An instance of the "Validator" class generated according to the defined field mapping.
     *
     * @protected
     */
    _getValidatorInstance(){
        if ( this._validator === null ){
            this._hasValidationRules = false;
            // No validator generated already, building a new one.
            const validationRules = {};
            let hasMessages = false, messages = {};
            // Iterate all the fields contained in the form mapping object and extract the validation rules defined for each field.
            for ( const field in this._mapping ){
                if ( this._mapping.hasOwnProperty(field) ){
                    // Extract all the validation rules and messages for current field.
                    if ( this._mapping[field].hasOwnProperty('validationRules') && Array.isArray(this._mapping[field].validationRules) && this._mapping[field].validationRules.length > 0 ){
                        validationRules[field] = this._mapping[field].validationRules;
                        this._hasValidationRules = true;
                    }
                    if ( this._mapping[field].hasOwnProperty('messages') && this._mapping[field].messages !== null && typeof this._mapping[field].messages === 'object' ){
                        messages[field] = this._mapping[field].messages;
                        hasMessages = true;
                    }
                }
            }
            if ( !hasMessages ){
                messages = null;
            }
            // Generate the validator object.
            this._validator = new Validator(validationRules, messages);
            this._validator.setContext(this._context);
        }
        return this._validator;
    }

    /**
     * Generates and returns the type mapping according to the defined field mapping.
     *
     * @returns {Object.<string, string>} An object having as key the field name and as value the name of the type it should be casted to.
     *
     * @protected
     */
    _getTypeMapping(){
        if ( this._typeMapping === null ){
            this._hasTypeMapping = false;
            this._typeMapping = {};
            // Iterate all the fields contained in the form mapping object and extract the types defined for each field.
            for ( const field in this._mapping ){
                if ( this._mapping.hasOwnProperty(field) && this._mapping[field].hasOwnProperty('type') && this._mapping[field].type !== '' && typeof this._mapping[field].type === 'string' ){
                    this._typeMapping[field] = this._mapping[field].type;
                    this._hasTypeMapping = true;
                }
            }
        }
        return this._typeMapping;
    }

    /**
     * The class constructor.
     *
     * @param {?Context} [context] An instance of the class "Context" containing both the request and response streams.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(context = null){
        /**
         * @type {Object.<string, FieldMapping>} [_mapping] An object containing the mapping for each field of the form.
         *
         * @protected
         */
        this._mapping = null;

        /**
         * @type {Validator} [_validator] An instance of the class "Validator" that will be used during the validation process.
         *
         * @protected
         */
        this._validator = null;

        /**
         * @type {Object.<string, string>} [_typeMapping] An object having as key the field name and as value the name of the type it should be casted to.
         *
         * @protected
         */
        this._typeMapping = null;

        /**
         * @type {?Context} [_context] An instance of the class "Context" containing both the request and response streams of the request where this form is used in.
         *
         * @protected
         */
        this._context = null;

        /**
         * @type {boolean} [_hasValidationRules=false] If at least one validation rule has been defined will be set to "true".
         *
         * @protected
         */
        this._hasValidationRules = false;

        /**
         * @type {boolean} [_hasTypeMapping=false] If at least one type has been defined in mapping object this property will be set to "true".
         *
         * @protected
         */
        this._hasTypeMapping = false;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Form' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
        this.setContext(context);
    }

    /**
     * Sets the request context where this form is used in, this method is chainable.
     *
     * @param {?Context} context An instance of the class "Context" containing both the request and response streams.
     *
     * @returns {Form}
     *
     * @throws {InvalidArgumentException} If an invalid context instance is given.
     */
    setContext(context){
        if ( context !== null && !( context instanceof Context ) ){
            throw new InvalidArgumentException('Invalid context.', 1);
        }
        this._context = context;
        return this;
    }

    /**
     * Return the request context where this form is used in.
     *
     * @returns {?Context} An instance of the class "Context" containing both the request and response streams or null if no context has been defined.
     */
    getContext(){
        return this._context;
    }

    /**
     * Returns all the error messages generated after the last validation process.
     *
     * @returns {*}
     */
    getErrorMessages(){
        return this._validator === null ? null : this._validator.getErrors();
    }

    /**
     * Validates the given fields according to the field mapping defined.
     *
     * @param {Object.<string, *>} values An object having as key the field name and as value its value.
     *
     * @returns {Promise<boolean>} If all the validation rules defined pass will be returned "true".
     *
     * @throws {InvalidArgumentException} If an invalid object containing the values to validate is given.
     *
     * @async
     */
    validate(values){
        if ( values === null || typeof values !== 'object' ){
            throw new InvalidArgumentException('Invalid values object.', 1);
        }
        const validator = this._getValidatorInstance();
        return this._hasValidationRules ? validator.dropErrors().validate(values) : true;
    }

    /**
     * Casts the given values according to the types defined in fields mapping.
     *
     * @param {Object.<string, *>} values An object having as key the field name and as value its value.
     *
     * @returns {?Object.<string, *>} An object containing the processed values.
     *
     * @throws {InvalidArgumentException} If an invalid object containing the values to validate is given.
     */
    typify(values){
        if ( values === null || typeof values !== 'object' ){
            throw new InvalidArgumentException('Invalid values object.', 1);
        }
        const typeMapping = this._getTypeMapping();
        let mergedResult;
        if ( this._hasTypeMapping ){
            const result = Typify.typify(typeMapping, values, false, true);
            mergedResult = Object.assign({}, values, result);
        }else{
            mergedResult = values;
        }
        return mergedResult;
    }

    /**
     * Executes both validation and casting according to the defined fields mapping.
     *
     * @param {Object.<string, *>} values An object having as key the field name and as value its value.
     *
     * @returns {Promise<*>} An object containing the processed values.
     *
     * @throws {InvalidArgumentException} If an invalid object containing the values to validate is given.
     *
     * @async
     */
    async process(values){
        if ( values === null || typeof values !== 'object' ){
            throw new InvalidArgumentException('Invalid values object.', 1);
        }
        return await this.validate(values) ? this.typify(values) : null;
    }
}

module.exports = Form;
