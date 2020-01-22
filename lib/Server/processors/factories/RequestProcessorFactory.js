'use strict';

// Including Lala's modules.
const ProcessorFactory = require('./ProcessorFactory');
const RequestProcessor = require('../RequestProcessor');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @typedef {Object} LanguageDeclaration An object containing the properties associate to a single language declaration.
 *
 * @property {string} language A string representing the language code.
 * @property {number} type An integer number representing the declaration type and that can be compared with the built-in constants.
 */

/**
 * @typedef {Object} LanguageDeclaration An object that contains the options used in bulk language declarations.
 *
 * @property {string} target A string containing the target that should match in order to use the given language, it could be a domain name as well as a path prefix.
 * @property {string} language A string containing the language code corresponding to this target.
 * @property {number} type An integer number representing the declaration type, one of the predefined constants can be used.
 */

/**
 * Allows the generation and configuration of instances of the class "RequestProcessor" based on given configuration.
 */
class RequestProcessorFactory extends ProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = RequestProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the maximum allowed length for request URLs, this method is chainable.
     *
     * @param {number} length An integer number greater than zero representing the length in characters.
     *
     * @return {RequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid length value is given.
     */
    setMaxURLLength(length){
        if ( length === null || isNaN(length) || length <= 0 ){
            throw new InvalidArgumentException('Invalid maximum URL length.', 1);
        }
        this._properties.maxURLLength = length;
        return this;
    }

    /**
     * Returns the maximum allowed length for request URLs.
     *
     * @return {number} An integer number greater than zero representing the length in characters, by default 8192.
     */
    getMaxURLLength(){
        return this._properties.maxURLLength;
    }

    /**
     * Sets the regex to use to extract information from the request url, this method is chainable.
     *
     * @param {?(RegExp|string)} regex An instance of the class "RegExp" representing the regex or null if no regex should be applied, a string can also be used, capturing groups should be named.
     *
     * @returns {RequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If An invalid regex is given.
     */
    setURLMapping(regex){
        if ( regex!== null && !( regex instanceof RegExp ) && ( regex === '' || typeof regex !== 'string' ) ){
            throw new InvalidArgumentException('Invalid regex.', 1);
        }
        this._properties.URLMapping = typeof regex === 'string' ? new RegExp(regex) : regex;
        return this;
    }

    /**
     * Returns the regex defined that will be used to extract information from the request url.
     *
     * @returns {?RegExp} An instance of the class "RegExp" representing the regex defined or null iff no regex has been defined.
     */
    getURLMapping(){
        return this._properties.URLMapping;
    }

    /**
     * Adds a language declaration used to automatically define the language to use when handling a request matching the given rule, this method is chainable.
     *
     * @param {string} target A string containing the target that should match in order to use the given language, it could be a domain name as well as a path prefix.
     * @param {string} language A string containing the language code corresponding to this target.
     * @param {number} type An integer number representing the declaration type, one of the predefined constants can be used.
     *
     * @returns {RequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid target is given.
     * @throws {InvalidArgumentException} If an invalid language is given.
     * @throws {InvalidArgumentException} If an unsupported declaration type is given.
     */
    addLanguageDeclaration(target, language, type){
        if ( target === '' || typeof target !== 'string' ){
            throw new InvalidArgumentException('Invalid target.', 1);
        }
        if ( language === '' || typeof language !== 'string' ){
            throw new InvalidArgumentException('Invalid language.', 2);
        }
        //
        const value = {
            language: language,
            type: type
        };
        switch ( type ){
            case RequestProcessorFactory.TLD_LANGUAGE_DECLARATION:
            case RequestProcessorFactory.SUB_DOMAIN_LANGUAGE_DECLARATION: {
                //
                this._properties.languageDeclarations.set(target, value);
            }break;
            case RequestProcessorFactory.PATH_PREFIX_LANGUAGE_DECLARATION: {
                //
                if ( target.charAt(0) !== '/' ){
                    target = '/' + target;
                }
                this._properties.languageDeclarations.set(target, value);
            }break;
            default: {
                throw new InvalidArgumentException('Unsupported declaration type.', 3);
            }
        }
        return this;
    }

    /**
     * Removes a language from the list of all the declarations used to automatically detect the language to use, this method is chainable.
     *
     * @param {string} target A string containing the target that should match in order to use the given language, it could be a domain name as well as a path prefix.
     * @param {number} type An integer number representing the declaration type, one of the predefined constants can be used.
     *
     * @returns {RequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid target is given.
     * @throws {InvalidArgumentException} If an unsupported declaration type is given.
     */
    removeLanguageDeclaration(target, type){
        if ( target === '' || typeof target !== 'string' ){
            throw new InvalidArgumentException('Invalid target.', 1);
        }
        switch ( type ){
            case RequestProcessorFactory.TLD_LANGUAGE_DECLARATION:
            case RequestProcessorFactory.SUB_DOMAIN_LANGUAGE_DECLARATION: {
                this._properties.languageDeclarations.delete(target);
            }break;
            case RequestProcessorFactory.PATH_PREFIX_LANGUAGE_DECLARATION: {
                if ( target.charAt(0) !== '/' ){
                    target = '/' + target;
                }
                this._properties.languageDeclarations.delete(target);
            }break;
            default: {
                throw new InvalidArgumentException('Unsupported declaration type.', 2);
            }
        }
        return this;
    }

    /**
     * Sets the language declarations to use to automatically detect the language to use when handling client requests, this method is chainable.
     *
     * @param {?LanguageDeclaration[]} declarations An array containing the language definitions as object, each object should provide the target to match, the corresponding language code and the declaration type.
     *
     * @returns {RequestProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setLanguageDeclarations(declarations){
        if ( declarations !== null && !Array.isArray(declarations) ){
            throw new InvalidArgumentException('Invalid declarations array.', 1);
        }
        this.dropLanguageDeclarations();
        if ( declarations !== null ){
            const length = declarations.length;
            if ( length > 0 ){
                for ( let i = 0 ; i < length ; i++ ){
                    if ( declarations[i] !== null && typeof declarations[i] === 'object' ){
                        this.addLanguageDeclaration(declarations[i].target, declarations[i].language, declarations[i].type);
                    }
                }
            }
        }
        return this;
    }

    /**
     * Removes all language declarations defined, this method is chaianble.
     *
     * @returns {RequestProcessorFactory}
     */
    dropLanguageDeclarations(){
        this._properties.languageDeclarations.clear();
        return this;
    }

    /**
     * Returns all the language declarations that have been defined.
     *
     * @returns {LanguageDeclaration[]} An array containing all the declarations as objects.
     */
    getLanguageDeclarations(){
        const declarations = [];
        for ( const [target, declaration] of this._properties.languageDeclarations ){
            declarations.push({
                target: target,
                language: declaration.language,
                type: declaration.type
            });
        }
        return declarations;
    }

    /**
     * Generates an instance of the class "RequestProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {RequestProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const requestProcessor = new RequestProcessor();
        // Configuring class instance.
        requestProcessor.configure(this._properties);
        return requestProcessor;
    }
}

Object.defineProperty(RequestProcessorFactory, 'TLD_LANGUAGE_DECLARATION', {
    writable: false,
    configurable: false,
    enumerable: false,
    value: 1
});

Object.defineProperty(RequestProcessorFactory, 'SUB_DOMAIN_LANGUAGE_DECLARATION', {
    writable: false,
    configurable: false,
    enumerable: false,
    value: 2
});

Object.defineProperty(RequestProcessorFactory, 'PATH_PREFIX_LANGUAGE_DECLARATION', {
    writable: false,
    configurable: false,
    enumerable: false,
    value: 3
});

module.exports = RequestProcessorFactory;
