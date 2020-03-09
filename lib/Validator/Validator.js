'use strict';

// Including Lala's modules.
const ValidationRuleRepository = require('./ValidationRuleRepository');
const Context = require('../Types/Context');
const {
    InvalidArgumentException,
    NotFoundException,
    ParseException
} = require('../Exceptions');

/**
 * @typedef {Object} ValidationRuleComponents An object containing all the attributes extracted by the validation rule parser.
 *
 * @param {boolean} isNegated If set to "true" the result of the validation rule should be negated.
 * @param {string} name A string containing the name of the validation rule.
 * @param {?string[]} params An array of strings containing the parameters to pass to the validation rule.
 */

/**
 * @typedef ValidationRuleParams An object containing some information related to a validation rule.
 *
 * @property {string} name A string containing the name of the validation rule.
 * @property {ValidationRule} rule An instance of the class that implements the validation rule.
 * @param {boolean} isNegated If set to "true" the result of the validation rule should be negated.
 * @property {boolean} isAsync If set to "true" it means that the validation rule is meant to be execute asynchronously.
 */

/**
 * Allows to validate data based on some validation rules.
 */
class Validator {
    /**
     * Parses a given validation rule invocation.
     *
     * @param {string} expression A string containing the validation rule invocation.
     *
     * @returns {ValidationRuleComponents} An object containing the components extracted by the parser.
     *
     * @throws {ParseException} If the validation rule invocation appears to be malformed.
     * @throws {ParseException} If the validation rule invocation contains the "<>" combination without any valid parameter in it.
     *
     * @protected
     */
    static _parseRule(expression){
        // Check if the validation rule result must be negated.
        const isNegated = expression.charAt(0) === '!';
        if ( isNegated ){
            // This rule must be negated, remove the "!" from the original expression.
            expression = expression.substr(1);
        }
        if ( expression.length === 0 ){
            throw new ParseException('Invalid validation rule syntax.', 1);
        }
        // Check if the validation rule invocation contains some parameters.
        const paramsStartIndex = expression.indexOf('<');
        let ruleName = expression, params = null;
        if ( paramsStartIndex !== -1 ){
            // Validation rule contains some parameters, check if the invocation is well-formed.
            if ( paramsStartIndex === 0 || expression.charAt(expression.length - 1) !== '>' ){
                throw new ParseException('Invalid validation rule syntax.', 1);
            }
            // Separate the rule name form the parameters list in the invocation string.
            ruleName = expression.substr(0, paramsStartIndex);
            const paramList = expression.substring(paramsStartIndex + 1, expression.length - 1);
            const rawParams = paramList.replace(/([^\\]),/g, '$1\u000B').split('\u000B');
            const length = rawParams.length;
            params = [];
            // Validate and remove spaces from each parameter.
            for ( let i = 0 ; i < length ; i++ ){
                const value = rawParams[i].trim().replace(/\\,/g, ',');
                if ( value !== '' ){
                    params.push(value);
                }
            }
            if ( params.length === 0 ){
                throw new ParseException('Validation rule without parameters are not allowed.', 2);
            }
        }
        return {
            isNegated: isNegated,
            name: ruleName,
            params: params
        };
    }

    /**
     * Processes defined mapping producing a new object containing an instance of the class that implements all the defined rules.
     *
     * @throws {InvalidArgumentException} If a malformed validation rule is found.
     * @throws {InvalidArgumentException} If an undefined validation rule is found.
     *
     * @protected
     */
    _prepareMapping(){
        this._processedMapping = {};
        // Loop for each parameter defined.
        for ( const fieldName in this._mapping ){
            if ( this._mapping.hasOwnProperty(fieldName) && Array.isArray(this._mapping[fieldName]) ){
                const rules = [], length = this._mapping[fieldName].length;
                // Loop for each rule defined for this parameter.
                for ( let i = 0 ; i < length ; i++ ){
                    const ruleComponents = Validator._parseRule(this._mapping[fieldName][i]);
                    // Get the class that implements current parameter.
                    const rule = ValidationRuleRepository.get(ruleComponents.name);
                    if ( rule === null ){
                        throw new NotFoundException('Validation rule not found: ' + ruleComponents.name, 2);
                    }
                    // Create an instance of the rule found.
                    const ruleInstance = new rule(ruleComponents.params);
                    rules.push({
                        name: ruleComponents.name,
                        rule: ruleInstance,
                        isNegated: ruleComponents.isNegated,
                        isAsync: rule.isAsync()
                    });
                }
                if ( rules.length > 0 ){
                    this._processedMapping[fieldName] = rules;
                }
            }
        }
    }

    /**
     * Pushes an error message to the list of the error messages of a given field.
     *
     * @param {string} fieldName A string containing the name of the field the error message is about.
     * @param {*} fieldValue The arbitrary field value.
     * @param {ValidationRuleParams} ruleData An object containing the attributes related to the validation rule that didn't pass.
     *
     * @protected
     */
    _addError(fieldName, fieldValue, ruleData){
        let message;
        // Check if a custom error message has been defined for this field and validation rule.
        if ( this._messages.hasOwnProperty(fieldName) && this._messages[fieldName].hasOwnProperty(ruleData.name) && typeof this._messages[fieldName][ruleData.name] === 'string' ){
            message = this._messages[fieldName][ruleData.name];
        }else{
            // No custom error message defined, use the rule's one.
            message = ruleData.rule.getMessage();
        }
        // Replace placeholders with the actual values.
        message = message.replace(/{fieldName}/g, fieldName);
        message = message.replace(/{fieldValue}/g, fieldValue);
        // Add the error message to the list.
        if ( !this._errors.hasOwnProperty(fieldName) ){
            this._errors[fieldName] = {};
        }
        this._errors[fieldName][ruleData.name] = message;
    }

    /**
     * The class constructor.
     *
     * @param {Object.<string, string[]>} mapping An object having as key the name of the field and as value an array of strings containing the validation rules.
     * @param {?Object.<string, Object.<string, string>>} [messages] An object containing the custom error messages to use organized according to this logic: <fieldName, <ruleName, message>>.
     *
     * @throws {InvalidArgumentException} If an invalid mapping object is given.
     * @throws {InvalidArgumentException} If a malformed validation rule is found.
     * @throws {InvalidArgumentException} If an undefined validation rule is found.
     */
    constructor(mapping, messages = null){
        /**
         * @type {Object.<string, string[]>} _mapping An object having as key the name of the field to be validated and as value an array containing the validation rules.
         *
         * @protected
         */
        this._mapping = null;

        /**
         * @type {Object.<string, Object.<string, string>>} _messages An object having as key the field name and as value an object containing the messages for each validation rule.
         *
         * @protected
         */
        this._messages = {};

        /**
         * @type {Object.<string, ValidationRuleParams[]>} _processedMapping An object containing the processed validation rules having as key the field name and as value the processed rule attributes.
         *
         * @protected
         */
        this._processedMapping = null;

        /**
         * @type {Object.<string, Object.<string, string>>} _errors An object containing the error messages generated after the validation process and stored according to this logic: <fieldName, <ruleName, message>>.
         *
         * @protected
         */
        this._errors = {};

        /**
         * @type {?Context} [_context] An instance of the class "Context" containing both the request and response streams of the request where this validator is used in.
         *
         * @protected
         */
        this._context = null;

        this.setMapping(mapping);
        if ( messages !== null && typeof messages === 'object' ){
            this._messages = messages;
        }
    }

    /**
     * Sets the fields to validate and the validation rules to apply to each of them, this method is chainable.
     *
     * @param {Object.<string, string[]>} mapping An object having as key the field name and as value an array of strings containing the names of the validation rules and their parameters (if supported).
     *
     * @returns {Validator}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     * @throws {InvalidArgumentException} If a malformed validation rule is found.
     * @throws {InvalidArgumentException} If an undefined validation rule is found.
     */
    setMapping(mapping){
        if ( mapping === null || typeof mapping !== 'object' ){
            throw new InvalidArgumentException('Invalid mapping object.', 1);
        }
        this._mapping = mapping;
        // Prepare all the defined validation rules' class instances.
        this._prepareMapping();
        return this;
    }

    /**
     * Returns the list of fields to validate and the corresponding validation rules defined.
     *
     * @returns {Object<string, string[]>} An object having as key the field name and as value an array containing the list of validation rules.
     */
    getMapping(){
        return this._mapping;
    }

    /**
     * Returns the validations errors occurred after last validation.
     *
     * @returns {Object<string, Object.<string, string>>} An object containing the error messages organized according to this logic: <fieldName, <ruleName, message>>.
     */
    getErrors(){
        return this._errors;
    }

    /**
     * Drops all the validation errors, this method is chainable.
     *
     * @returns {Validator}
     */
    dropErrors(){
        this._errors = {};
        return this;
    }

    /**
     * Sets the request context where this validator is used in, this method is chainable.
     *
     * @param {?Context} context An instance of the class "Context" containing both the request and response streams.
     *
     * @returns {Validator}
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
     * Return the request context where this validator is used in.
     *
     * @returns {?Context} An instance of the class "Context" containing both the request and response streams or null if no context has been defined.
     */
    getContext(){
        return this._context;
    }

    /**
     * Validates the given parameters.
     *
     * @param {Object.<string, *>} values An object containing the parameters to validate.
     *
     * @returns {Promise<boolean>} If all the validation rules defined pass will be returned "true".
     *
     * @throws {InvalidArgumentException} IF an invalid object containing the values to validate is given.
     *
     * @async
     */
    async validate(values){
        if ( values === null || typeof values !== 'object' ){
            throw new InvalidArgumentException('Invalid values object.', 1);
        }
        // Clean previous error messages.
        this._errors = {};
        let valid = true;
        const processes = [];
        // Iterate every parameter declared in class instance.
        for ( const fieldName in this._processedMapping ){
            if ( this._processedMapping.hasOwnProperty(fieldName) ){
                const length = this._processedMapping[fieldName].length;
                // Iterate every validation rule defined for current parameter.
                for ( let i = 0 ; i < length ; i++ ){
                    if ( this._processedMapping[fieldName][i].isAsync ){
                        // Current validation rule is async, wrap it into a promise and then push it into a stack in order to process all them in parallel way.
                        processes.push(new Promise((resolve, reject) => {
                            this._processedMapping[fieldName][i].rule.validate(values[fieldName], this, values).then((result) => {
                                if ( this._processedMapping[fieldName][i].isNegated ){
                                    // Invert the validation result as this rule has been marked as negated.
                                    result = !result;
                                }
                                if ( result !== true ){
                                    // The validation rule didn't pass, push an error into the error stack.
                                    this._addError(fieldName, values[fieldName], this._processedMapping[fieldName][i]);
                                }
                                resolve(result);
                            }).catch((ex) => reject(ex));
                        }));
                    }else{
                        let result = this._processedMapping[fieldName][i].rule.validate(values[fieldName], this, values);
                        if ( this._processedMapping[fieldName][i].isNegated ){
                            // Invert the validation result as this rule has been marked as negated.
                            result = !result;
                        }
                        if ( result !== true ){
                            // The validation rule didn't pass, push an error into the error stack.
                            this._addError(fieldName, values[fieldName], this._processedMapping[fieldName][i]);
                            valid = false;
                        }
                    }
                }
            }
        }
        // Wait all the async validation rule to finish.
        const asyncResults = await Promise.all(processes);
        let length = asyncResults.length, i = 0;
        // Check the async validation rules results, if at least one rule failed, then mark the whole validation process as failed.
        while ( valid && i < length ){
            if ( !asyncResults[i] ){
                valid = false;
            }
            i++;
        }
        return valid;
    }
}

module.exports = Validator;
