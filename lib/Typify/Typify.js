'use strict';

// Including Lala's modules.
const TypeRepository = require('./TypeRepository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {Object} TypeAttributes An object containing attributed related to a parsed type definition.
 *
 * @property {string} type A string containing the type name.
 * @property {boolean} isOptional If set to "true" it means that the related attribute may not exist.
 * @property {?string} subType A string containing an additional type the main one is composed by.
 */

/**
 * Allows to convert serialized values into more appropriate representations according to given type definitions.
 */
class Typify {
    /**
     * Parses and extracts information related to a given type definition.
     *
     * @param {string} type A string containing the type definition.
     *
     * @returns {TypeAttributes} An object containing the attributes extracted after parsing.
     *
     * @protected
     *
     * @throws {InvalidArgumentException} If the given type definition is malformed or not valid.
     */
    static _parseType(type){
        // Remove spaces from the given type.
        type = type.replace(/\s+/g, '');
        let isOptional = false, subType = null;
        if ( type.charAt(0) === '?' ){
            // The first character is "?", the attribute related to this type is optional.
            isOptional = true;
            type = type.substr(1);
        }
        const index = type.indexOf('<');
        if ( index > 0 ){
            // Type definitions contains the character "<", a subtype has been defined.
            if ( type.charAt(type.length - 1) !== '>' ){
                throw new InvalidArgumentException('Malformed type definition.', 1);
            }
            // Extract the subtype and remove it from the main type.
            subType = type.substring(index + 1, type.length - 1);
            type = type.substr(0, index);
        }
        return {
            type: type,
            isOptional: isOptional,
            subType: subType
        };
    }

    /**
     * Converts the given value into the representation according to the given type definition.
     *
     * @param {string} value A string containing the value to convert.
     * @param {TypeAttributes} typeProperties An object containing all the attributes related to the type to use.
     *
     * @returns {*} The converted value.
     *
     * @protected
     *
     * @throws {InvalidArgumentException} If the given type has not been registered.
     */
    static _castValue(value, typeProperties){
        let castedValue = value;
        if ( typeProperties.type !== 'string' ){
            // Given type is not a string, a conversion must be performed.
            const castingFunction = TypeRepository.get(typeProperties.type);
            if ( castingFunction === null ){
                throw new InvalidArgumentException('Undefined type.', 1);
            }
            // Apply the function that implements the conversion for the given type.
            castedValue = castingFunction(value, typeProperties.subType);
        }
        return castedValue;
    }

    /**
     * Converts the properties of a given object according to the given properties mapping.
     *
     * @param {Object.<string, string>} properties An object containing the object's properties mapping.
     * @param {Object.<string, string>} values An object containing the values to convert.
     * @param {boolean} [skipOptionals=false] If set to "true" optional values, if not found, will not be returned, otherwise they will be returned as "null".
     *
     * @returns {?Object.<string, *>} An object containing the converted value or null if the given value doesn't meet given mapping.
     *
     * @throws {InvalidArgumentException} If an invalid object mapping is given.
     * @throws {InvalidArgumentException} If an invalid object to convert is given.
     * @throws {InvalidArgumentException} If the given type has not been registered.
     * @throws {InvalidArgumentException} If the given type definition is malformed or not valid.
     */
    static typify(properties, values, skipOptionals = false){
        if ( properties === null || typeof properties !== 'object' ){
            throw new InvalidArgumentException('Invalid object mapping.', 1);
        }
        if ( values === null || typeof values !== 'object' ){
            throw new InvalidArgumentException('Invalid values.', 2);
        }
        const results = {};
        for ( let name in properties ){
            if ( properties.hasOwnProperty(name) ){
                // Parse current type.
                const typeProperties = Typify._parseType(properties[name]);
                if ( !values.hasOwnProperty(name) || values[name] === '' || values[name] === null || typeof values[name] === 'undefined' ){
                    // Current property doesn't exist in values object.
                    if ( !typeProperties.isOptional ){
                        return null;
                    }
                    if ( skipOptionals !== true ){
                        results[name] = null;
                    }
                }else{
                    // Convert current value according to mapping object.
                    results[name] = Typify._castValue(values[name], typeProperties);
                    if ( results[name] === null ){
                        // Converted value is not valid according to casting implementation.
                        return null;
                    }
                }
            }
        }
        return results;
    }

    /**
     * Converts multiple objects according to a given properties mapping.
     *
     * @param {Object.<string, string>} properties An object containing the object's properties mapping.
     * @param {Object.<string, string>[]} values An array containing the objects to convert.
     * @param {boolean} [skipOptionals=false] If set to "true" optional values, if not found, will not be returned, otherwise they will be returned as "null".
     *
     * @returns {Object.<string, *>[]} An array containing the converted object, invalid objects will be set as "null".
     *
     * @throws {InvalidArgumentException} If an invalid object mapping is given.
     * @throws {InvalidArgumentException} If an invalid array of values.
     * @throws {InvalidArgumentException} If the given type has not been registered.
     * @throws {InvalidArgumentException} If the given type definition is malformed or not valid.
     */
    static typifyMulti(properties, values, skipOptionals = false){
        if ( properties === null || typeof properties !== 'object' ){
            throw new InvalidArgumentException('Invalid object mapping.', 1);
        }
        if ( !Array.isArray(values) ){
            throw new InvalidArgumentException('Invalid values array.', 2);
        }
        const castedValues = [], length = values.length;
        for ( let i = 0 ; i < length ; i++ ){
            castedValues.push(Typify.typify(properties, values[i], skipOptionals));
        }
        return castedValues;
    }

    /**
     * Converts a given value according to a given type definition.
     *
     * @param {string} value A string representing the value to convert.
     * @param {string} type A string containing the type definition.
     *
     * @returns {*} The converted value or null if the given value doesn't meet the given type.
     *
     * @throws {InvalidArgumentException} If an invalid value is given.
     * @throws {InvalidArgumentException} If an invalid type is given.
     * @throws {InvalidArgumentException} If the given type has not been registered.
     * @throws {InvalidArgumentException} If the given type definition is malformed or not valid.
     */
    static typifyValue(value, type){
        if ( typeof value !== 'string' ){
            throw new InvalidArgumentException('Invalid value.', 1);
        }
        if ( type === '' || typeof type !== 'string' ){
            throw new InvalidArgumentException('Invalid type.', 2);
        }
        // Parse the given type.
        const typeProperties = Typify._parseType(type);
        return value === '' ? null : Typify._castValue(value, typeProperties);
    }

    /**
     * Converts multiple values according to a given type definition.
     *
     * @param {string[]} values An array of strings containing the values to convert.
     * @param {string} type A string containing the type definition.
     *
     * @returns {*[]} An array containing the converted values, values that don't match the given type will be set as null.
     *
     * @throws {InvalidArgumentException} If an invalid array of values is given.
     * @throws {InvalidArgumentException} If an invalid type is given.
     * @throws {InvalidArgumentException} If the given type has not been registered.
     * @throws {InvalidArgumentException} If the given type definition is malformed or not valid.
     */
    static typifyMultipleValues(values, type){
        if ( !Array.isArray(values) ){
            throw new InvalidArgumentException('Invalid values.', 1);
        }
        if ( type === '' || typeof type !== 'string' ){
            throw new InvalidArgumentException('Invalid type.', 2);
        }
        // Parse the given type.
        const typeProperties = Typify._parseType(type);
        let castedValues;
        if ( typeProperties.type !== 'string' ){
            castedValues = [];
            const length = values.length;
            for ( let i = 0 ; i < length ; i++ ){
                castedValues.push(Typify._castValue(values[i], typeProperties));
            }
        }else{
            castedValues = value;
        }
        return castedValues;
    }
}

module.exports = Typify;
