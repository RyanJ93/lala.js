'use strict';

// Including native modules.
const querystring = require('querystring');

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const ParamMiddlewares = require('./mixins/ParamMiddlewares');
const Keywords = require('../Support/Keywords');
const Context = require('../Types/Context');
const Form = require('../Form/Form');
const { mixin } = require('../Helpers/helpers/BuiltInHelpers');
const {
    RuntimeException,
    InvalidArgumentException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * @typedef {BaseRouteOptions} ParameterizedRouteOptions Defines the additional properties supported by the routes that support parameters.
 *
 * @property {?Object.<string, (string|RegExp)>} filters An object having as value a string or a regex containing the condition to apply to the corresponding parameter used as item key.
 * @property {ParamMiddlewareDefinition[]} [paramMiddlewares] An array containing the middlewares to execute in order to process and mutate route parameters, each middleware is represented as an object.
 * @property {?Form} [form] The form containing a mapping for the parameters sent by the client used to validate incoming data, it must extend the "Form" class.
 */

/**
 * This class allows to implement routes that support parameters and parameter related middlewares.
 *
 * @mixes ParamMiddlewares
 *
 * @abstract
 */
class ParameterizedRoute extends mixin(BaseRoute, ParamMiddlewares) {
    /**
     * Configure a given route instance according to the given options.
     *
     * @param {ParameterizedRouteOptions} options An object containing the configuration options the given route will be configured with.
     * @param {ParameterizedRoute} instance A route instance.
     *
     * @protected
     */
    static _configureInstance(options, instance){
        super._configureInstance(options, instance);
        if ( options.hasOwnProperty('filters') && options.filters !== null && typeof options.filters === 'object' ){
            instance.setParameterFilters(options.filters);
        }
        if ( options.hasOwnProperty('paramMiddlewares') && Array.isArray(options.paramMiddlewares) ){
            instance.setParamMiddlewares(options.paramMiddlewares);
        }
        if ( options.hasOwnProperty('form') && options.form.prototype instanceof Form ){
            instance.setForm(options.form);
        }
    }

    /**
     * Generates a surrogate ID to use as a replacement for a parameter name used as a name for the capturing group in the generated regex.
     *
     * @returns {string} A string representing the generated unique surrogate ID.
     *
     * @protected
     */
    _generateSurrogate(){
        // Generate the surrogate ID be generating a random number, multiply it by 100 to ensure no scientific notation to appear in string representation, then remove the integer part plus the comma sign.
        let surrogate = '_' + ( Math.random() * 1000 ).toString().substr(4);
        // Ensure the generated surrogate ID doesn't exist.
        while ( this._parameterSurrogates.has(surrogate) ){
            surrogate = '_' + ( Math.random() * 1000 ).toString().substr(4);
        }
        return surrogate;
    }

    /**
     * Generates the regular expression patter to use for capture a given parameter.
     *
     * @param {string} name A string containing the parameter name.
     * @param {boolean} optional If set to "true" it means that the parameter to capture is optional.
     *
     * @return {string} A string containing the regular expression generated.
     *
     * @protected
     */
    _getParameterRegex(name, optional){
        // Get filter value.
        const filter = this._parameterFilters.get(name);
        // Generate a surrogate ID to be used as an alternative to the original parameter name in named capturing groups in the generated regex.
        const surrogate = this._generateSurrogate();
        const opening = '(?<' + surrogate + '>';
        // Pick the right syntax for the regex capturing group.
        const closing = optional === true ? ')?' : ')';
        let regex = null;
        if ( typeof filter === 'undefined' ){
            // No filter defined for the given parameter, using the generic regex.
            regex = opening + '[a-zA-Z0-9_\.-]+' + closing;
        }else if ( typeof filter === 'string' ){
            if ( filter.charAt(0) === '@' ){
                // This filter has been defined using a keyword, for instance: @number => '[0-9]+'.
                const keyword = Keywords.getValue(filter);
                regex = keyword === null ? ( opening + '[a-zA-Z0-9_\.-]+' + closing ) : ( opening + keyword + closing );
            }else{
                regex = opening + filter + closing;
            }
        }else{
            // This filter has been defined as an instance of the class "RegExp", getting its string representation.
            regex = opening + filter.toString() + closing;
        }
        // Register the generated surrogate ID and assign it to the processed parameter name.
        this._parameterSurrogates.set(surrogate, name);
        return regex;
    }

    /**
     * Extracts all the parameters required by this route according to its path.
     *
     * @protected
     */
    _prepare(){
        // Drop older parameters.
        this._parameters.clear();
        if ( this._allowParameters === true && this._path !== null && typeof this._path === 'string' ){
            // Split the route path into levels.
            const components = this._path.split('/');
            const length = components.length;
            let count = 0;
            for ( let i = 0 ; i < length ; i++ ){
                // Get the parameter prefix used to determine if it is a parameter and what kind of parameter is.
                const prefix = components[i].substr(0, 2);
                if ( prefix === '?:' ){
                    // If a parameter starts by "?:" it is an optional one, for instance: /posts/?:page.
                    const name = components[i].substr(2);
                    this._parameters.set(name, false);
                    // Get the patter to capture this parameter.
                    components[i] = this._getParameterRegex(name, true);
                    count++;
                }else if ( prefix.charAt(0) === ':' ){
                    // If a parameter starts by ":" it is a required one, for instance: /profiles/:username.
                    const name = components[i].substr(1);
                    this._parameters.set(name, true);
                    components[i] = this._getParameterRegex(name, false);
                    count++;
                }
            }
            // If at least one parameter has been found, convert the processed path into a RegExp object.
            this._regex = count === 0 ? null : new RegExp('^' + components.join('/') + '$');
        }
    }

    /**
     * Checks if a given parameters matches the filters defined for its value.
     *
     * @param {string} name A string containing the parameter name.
     * @param {*} value The parameter value that will be validated.
     *
     * @returns {boolean} If validation passes or no filter has been defined for the given parameter will be returned "true".
     *
     * @protected
     */
    _validateParameterValue(name, value){
        let valid = true;
        if ( this._parameterFilters.has(name)){
            // A filter has been defined for this parameter, get the regex for validation.
            const filter = this._getParameterRegex(name, false);
            // Generate the regex from its string representation.
            const regex = new RegExp(filter);
            valid = ( typeof value === 'string' ? value.match(regex) : value.toString().match(regex) ) !== null;
        }
        return valid;
    }

    /**
     * Generates and sets the route tag from the path that has been defined.
     *
     * @override
     * @protected
     */
    _computeTag(){
        let tag = null;
        // Generate the tag from the route path whenever it is a string, regex are still unsupported.
        if ( typeof this._path === 'string' ){
            // Extract and validates route path components.
            tag = this._path.split('/').filter((component) => {
                return component !== '' && component.charAt(0) !== ':' && component.substr(0, 2) !== '?:';
            }).join('-');
        }
        this._tag = tag;
    }

    /**
     * Executes the validation rules declared in the form that has been defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @async
     * @protected
     */
    async _processForm(request, response){
        if ( this._form !== null ){
            // Generate a context object that wraps current request streams.
            const context = new Context(request, response);
            // Generate a single object containing the input parameters.
            const params = Object.assign({}, request.query, request.params, request.files);
            // Initialize the form object and execute validations.
            const form = new this._form(context);
            const valid = await form.validate(params);
            request.originalQuery = request.query;
            request.originalParams = request.params;
            request.queryTypifyFailure = request.paramsTypifyFailure = false;
            if ( valid ){
                // Request data is valid according to the form, cast parameters according to defined types.
                if ( request.query !== null && typeof request.query === 'object' ){
                    request.query = form.typify(request.query);
                    request.queryTypifyFailure = request.query === null;
                }
                if ( request.params !== null && typeof request.params === 'object' ){
                    request.params = form.typify(request.params);
                    request.queryTypifyFailure = request.params === null;
                }
                request.formErrors = null;
            }else{
                request.formErrors = form.getErrorMessages();
            }
            request.formValid = valid;
        }
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor() {
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'ParameterizedRoute' ) {
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {Map<string, boolean>} _parameters A map containing all the parameters defined in this route path and having as key the parameter name and as value a boolean indicating is the parameter is required.
         *
         * @protected
         *
         * renom
         */
        this._parameters = new Map();

        /**
         * @type {Map<string, RegExp>} _parameterFilters A map having as key a string representing the param name and as value a regex (a string or a RegExp object) containing the filtering condition to apply.
         *
         * @protected
         */
        this._parameterFilters = new Map();

        /**
         * @type {Map<string, string>} _parameterSurrogates A map containing the labels assigned to parameters' capturing groups generated in the regex used as replacement to original names in order to avoid escaping.
         *
         * @protected
         */
        this._parameterSurrogates = new Map();

        /**
         * @type {?Form} [_form] The form containing a mapping for the parameters sent by the client used to validate incoming data, it must extend the "Form" class.
         *
         * @private
         */
        this._form = null;
    }

    /**
     * Sets the path that will trigger this route whenever a request occurs, this method is chainable.
     *
     * @param {(string|RegExp)} path A string representing the path to the route, alternatively, an instance of the class "RegExp" can be used as well.
     *
     * @returns {ParameterizedRoute}
     *
     * @override
     */
    setPath(path){
        super.setPath(path);
        // Extract the route parameters (if allowed) and generate the regex.
        this._prepare();
        return this;
    }

    /**
     * Returns the names of all the parameters required by this route.
     *
     * @return {Set<string>} A set containing the parameter names as strings.
     */
    getParameters(){
        const parameters = new Set();
        for ( const [name, required] of this._parameters ){
            if ( required ){
                parameters.add(name);
            }
        }
        return parameters;
    }

    /**
     * Returns the names of all the optional parameters accepted by this route.
     *
     * @return {Set<string>} A set containing the parameter names as strings.
     */
    getOptionalParameters(){
        const parameters = new Set();
        for ( const [name, required] of this._parameters ){
            if ( !required ){
                parameters.add(name);
            }
        }
        return parameters;
    }

    /**
     * Returns the parameter name for a given parameter surrogate that has been assigned in route path processing phase as a capture group name.
     *
     * @param {string} surrogate A string containing the surrogate identifier to lookup.
     *
     * @returns {?string} A string containing the corresponding parameter name or null if no parameter has been found.
     */
    getParameterNameBySurrogate(surrogate){
        const name = this._parameterSurrogates.get(surrogate);
        return typeof name === 'undefined' ? null : name;
    }

    /**
     * Adds a filter for a given parameter, filter are basically regex used to validate parameters captured in request URL, this method is chainable.
     *
     * @param {string} parameter A string containing the parameter name, it can be both a required or an optional parameter but it must have been defined.
     * @param {?(string|RegExp)} filter A string containing the pattern that will be used to validate the parameter value, alternatively a RegExp object can be used as well.
     *
     * @returns {ParameterizedRoute}
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     * @throws {InvalidArgumentException} If an invalid filter is given.
     */
    addParameterFilter(parameter, filter){
        if ( parameter === '' || typeof parameter !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        if ( ( filter === '' || typeof filter !== 'string' ) && !( filter instanceof RegExp ) ){
            throw new InvalidArgumentException('Invalid filter.', 2);
        }
        this._emitUpdateEvent('parameterFilters', {
            parameter: filter
        });
        this._parameterFilters.set(parameter, filter);
        // Rebuilds route regex according to given filters.
        this._prepare();
        this.emit('updated', 'parameterFilters');
        return this;
    }

    /**
     * Removes the filter that has been set on a given parameter, this method is chainable.
     *
     * @param {string} parameter A string containing the parameter name.
     *
     * @returns {ParameterizedRoute}
     */
    removeParameterFilter(parameter){
        if ( parameter === '' || typeof parameter !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        this._emitUpdateEvent('parameterFilters', parameter);
        this._parameterFilters.delete(parameter);
        this._prepare();
        this.emit('updated', 'parameterFilters');
        return this;
    }

    /**
     * Sets the filters of the parameters defined in route path, this method is chainable.
     *
     * @param {Object.<string, (string|RegExp)>} filters An object having as key a string representing the parameter name and as value the filter as a string or a RegExp instance.
     *
     * @returns {ParameterizedRoute}
     *
     * @throws {InvalidArgumentException} If an invalid object containing the filters is given.
     */
    setParameterFilters(filters){
        if ( filters === null || typeof filters !== 'object' ){
            throw new InvalidArgumentException('Invalid filters object.', 1);
        }
        // Remove all the existing filters.
        this._parameterFilters.clear();
        this._emitUpdateEvent('parameterFilters', filters);
        for ( const parameter in filters ){
            if ( filters.hasOwnProperty(parameter) ){
                if ( ( filters[parameter] !== '' && typeof filters[parameter] === 'string' ) || filters[parameter] instanceof RegExp ){
                    this._parameterFilters.set(parameter, filters[parameter]);
                }
            }
        }
        // Rebuilds route regex according to new filters.
        this._prepare();
        this.emit('updated', 'parameterFilters');
        return this;
    }

    /**
     * Returns all the filters defined and that will be applied on parameters found.
     *
     * @return {Map<string, RegExp>} A map having as key the parameter name and as value the filter as a string or a RegExp instance, it depends on how it has been defined originally.
     */
    getParameterFilters(){
        return this._parameterFilters;
    }

    /**
     * Removes all the defined filter, this method is chainable.
     *
     * @returns {ParameterizedRoute}
     */
    dropParameterFilters(){
        this._parameterFilters.clear();
        this._emitUpdateEvent('parameterFilters', null);
        this._parameterFilters.clear();
        this.emit('updated', 'parameterFilters');
        this._prepare();
        return this;
    }

    /**
     * Sets the form to use to validate incoming data, this method is chainable.
     *
     * @param {?Form} form The form containing a mapping for the parameters sent by the client used to validate incoming data, it must extend the "Form" class.
     *
     * @returns {ParameterizedRoute}
     *
     * @throws {InvalidArgumentException} If an invalid form class is given.
     */
    setForm(form){
        if ( form !== null && !( form.prototype instanceof Form ) ){
            throw new InvalidArgumentException('Invalid form instance.', 1);
        }
        this._form = form;
        return this;
    }

    /**
     * Returns the form to use to validate incoming data that has been defied.
     *
     * @returns {?Form} The form defined or null if no form has been defined.
     */
    getForm(){
        return this._form;
    }

    /**
     * Generates and returns a path that can be used in a request to trigger this route.
     *
     * @param {?Object.<string, string>} [parameters] An object having as key the parameter name and as value the value to replace in compiled path.
     *
     * @returns {?string} A string containing the path or null if no path has been defined for this route.
     *
     * @throws {BadMethodCallException} If no parameter has been given despite this route requires some parameters to be defined.
     * @throws {BadMethodCallException} If some required parameter value is missing.
     *
     * @override
     */
    compile(parameters = null){
        // Get the route path defined.
        let path = super.compile();
        const requiredParameters = [], optionalParameters = [];
        // Extract and separate required and optional parameters.
        for ( const [name, required] of this._parameters ){
            ( required === true ? requiredParameters : optionalParameters ).push(name);
        }
        if ( requiredParameters.length > 0 && ( parameters === null || typeof parameters !== 'object' ) ){
            throw new BadMethodCallException('No parameter given despite this route requires some parameters to be defined.', 1);
        }
        if ( path !== null && this._parameters.size > 0 ){
            // If at least one parameter has been defined in the route path then process given parameter values.
            const implemented = [], optionalImplemented = [], redundant = {};
            for ( const key in parameters ){
                if ( parameters.hasOwnProperty(key) ){
                    // In order to be replaced, parameters must exist in route path and must match the filter type, if defined, they must be rep
                    if ( requiredParameters.indexOf(key) !== -1 && implemented.indexOf(key) === -1 && this._validateParameterValue(key, parameters[key]) ){
                        path = path.replace(new RegExp('\/:' + key, 'g'), '/' + parameters[key]);
                        implemented.push(key);
                    }else if ( optionalParameters.indexOf(key) !== -1 && optionalImplemented.indexOf(key) === -1 && this._validateParameterValue(key, parameters[key]) ){
                        path = path.replace(new RegExp('/\\\?:' + key, 'g'), '/' + parameters[key]);
                        optionalImplemented.push(key);
                    }else{
                        // Save redundant parameters and add them as GET parameters later.
                        redundant[key] = parameters[key];
                    }
                }
            }
            if ( requiredParameters.length !== implemented.length ){
                throw new BadMethodCallException('You must defined every parameter contained in this route path.', 2);
            }
            // Remove all the optional parameters which no value has been defined for.
            for ( const parameter of optionalParameters ){
                if ( optionalImplemented.indexOf(parameter) === -1 ){
                    path = path.replace(new RegExp('/\\\?:' + parameter, 'g'), '');
                }
            }
            // Encode redundant parameters found as query string.
            const query = querystring.stringify(redundant);
            if ( query !== '' ){
                // If at least one redundant parameter if found, generate and append the query string generated.
                path += '?' + query;
            }
        }
        return path;
    }
}

module.exports = ParameterizedRoute;
