'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const ParamMiddlewares = require('./ParamMiddlewares');
const Keywords = require('../Support/Keywords');
const { mixin } = require('../helpers');
const {
    RuntimeException,
    InvalidArgumentException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * This class allows to implement routes that support parameters and parameter related middlewares.
 *
 * @mixes ParamMiddlewares
 *
 * @abstract
 */

class ParameterizedRoute extends mixin(BaseRoute, ParamMiddlewares) {
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
        // Pick the right syntax for the regex capturing group.
        const closing = optional === true ? ')?' : ')';
        if ( typeof filter === 'undefined' ){
            // No filter defined for the given parameter, using the generic regex.
            return '([a-zA-Z0-9_\.-]+' + closing;
        }
        if ( typeof filter === 'string' ){
            if ( filter.charAt(0) === '@' ){
                // This filter has been defined using a keyword, for instance: @number => '[0-9]+'.
                const keyword = Keywords.getValue(filter);
                return keyword === null ? ( '([a-zA-Z0-9_\.-]+' + closing ) : ( '(' + keyword + closing );
            }
            return '(' + filter + closing;
        }
        // This filter has been defined as an instance of the class "RegExp", getting its string representation.
        return '(' + filter.toString() + closing;
    }

    /**
     * Extracts all the parameters required by this route according to its path.
     *
     * @protected
     */
    _prepare(){
        // Drop older parameters.
        this._parameters = new Set();
        this._optionalParameters = new Set();
        if ( this._allowParameters === true && this._path !== null && typeof this._path === 'string' ){
            // Split the route path into levels.
            const components = this._path.split('/');
            const length = components.length;
            let count = 0;
            for ( let i = 0 ; i < length ; i++ ){
                // Get the parameter prefix used to determine if it is a parameter and what kind of parameter is.
                const prefix = components[i].substr(0, 2);
                if ( prefix === '?:' ){
                    // If a parameter starts by "?:" it is an optional one, for instance: /posts/?:page
                    const name = components[i].substr(2);
                    this._optionalParameters.add(name);
                    // Get the patter to capture this parameter.
                    components[i] = this._getParameterRegex(name, true);
                    count++;
                }else if ( prefix.charAt(0) === ':' ){
                    // If a parameter starts by ":" it is a required one, for instance: /profiles/:username
                    const name = components[i].substr(1);
                    this._parameters.add(name);
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
         * @type {Set<string>} _parameters A set containing all the parameters found in the route path.
         *
         * @protected
         */
        this._parameters = new Set();

        /**
         * @type {Set<string>} _optionalParameters A set containing all the optional parameters accepted by this route.
         *
         * @protected
         */
        this._optionalParameters = new Set();

        /**
         * @type {Map<string, RegExp>} _parameterFilters A map having as key a string representing the param name and as value a regex (a string or a RegExp object) containing the filtering condition to apply.
         *
         * @protected
         */
        this._parameterFilters = new Map();
    }

    /**
     * Sets the path that will trigger this route whenever a request occurs, this method is chainable.
     *
     * @param {(string|RegExp)} path A string representing the path to the route, alternatively, an instance of the class "RegExp" can be used as well.
     *
     * @returns {ParameterizedRoute}
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
        return this._parameters;
    }

    /**
     * Returns the names of all the optional parameters accepted by this route.
     *
     * @return {Set<string>} A set containing the parameter names as strings.
     */
    getOptionalParameters(){
        return this._optionalParameters;
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
        this._parameterFilters.set(parameter, filter);
        // Rebuilds route regex according to given filters.
        this._prepare();
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
        this._parameterFilters.delete(parameter);
        this._prepare();
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
        this._parameterFilters = new Map();
        for ( const parameter in filters ){
            if ( filters.hasOwnProperty(parameter) ){
                if ( ( filters[parameter] !== '' && typeof filters[parameter] === 'string' ) || filters[parameter] instanceof RegExp ){
                    this._parameterFilters.set(parameter, filters[parameter]);
                }
            }
        }
        // Rebuilds route regex according to new filters.
        this._prepare();
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
        this._parameterFilters = new Map();
        this._prepare();
        return this;
    }

    /**
     * Generates and returns a path that can be used in a request to trigger this route.
     *
     * @param {?Object.<string, *>} parameters An object having as key the parameter name and as value the value to replace in compiled path.
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
        if ( this._parameters.size > 0 && ( parameters === null || typeof parameters !== 'object' ) ){
            throw new BadMethodCallException('No parameter given despite this route requires some parameters to be defined.', 1);
        }
        if ( path !== null && ( this._parameters.size > 0 || this._optionalParameters.size > 0 ) ){
            // If at least one parameter has been defined in the route path then process given parameter values.
            const implemented = [], optionalImplemented = [];
            for ( const key in parameters ){
                if ( parameters.hasOwnProperty(key) ){
                    // In order to be replaced, parameters must exist in route path and must match the filter type, if defined, they must be rep
                    if ( this._parameters.has(key) && implemented.indexOf(key) === -1 && this._validateParameterValue(key, parameters[key]) ){
                        path = path.replace(new RegExp('\/:' + key, 'g'), '/' + parameters[key]);
                        implemented.push(key);
                    }else if ( this._optionalParameters.has(key) && optionalImplemented.indexOf(key) === -1 && this._validateParameterValue(key, parameters[key]) ){
                        path = path.replace(new RegExp('/\\\?:' + key, 'g'), '/' + parameters[key]);
                        optionalImplemented.push(key);
                    }
                }
            }
            // Remove all the optional parameters which no value has been defined for.
            for ( const parameter of this._optionalParameters ){
                if ( optionalImplemented.indexOf(parameter) === -1 ){
                    path = path.replace(new RegExp('/\\\?:' + parameter, 'g'), '');
                }
            }
            if ( this._parameters.size !== implemented.length ){
                throw new BadMethodCallException('You must defined every parameter contained in this route path.', 2);
            }
        }
        return path;
    }
}

module.exports = ParameterizedRoute;
