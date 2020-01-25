'use strict';

// Including Lala's modules.
const Provider = require('../Provider');
const TypeRepository = require('../../Typify/TypeRepository');
const Typify = require('../../Typify/Typify');

/**
 * Installs all the built-in types used by the "Typify" class.
 */
class TypeProvider extends Provider {
    /**
     * Registers the callback functions that implement built-in types.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    static async setup(){
        TypeRepository.register('int', (value) => {
            value = parseInt(value);
            return isNaN(value) ? null : value;
        });
        TypeRepository.register('float', (value) => {
            value = parseFloat(value);
            return isNaN(value) ? null : value;
        });
        TypeRepository.register('number', (value) => {
            value = value.indexOf('.') === -1 ? parseInt(value) : parseFloat(value);
            return isNaN(value) ? null : value;
        });
        TypeRepository.register('boolean', (value) => {
            if ( value === '1' || value === 'true' ){
                value = true;
            }else if ( value === '0' || value === 'false' ){
                value = false;
            }else{
                value = value.toLowerCase();
                value = value === 'true' ? true : ( value === 'false' ? false : null );
            }
            return value;
        });
        TypeRepository.register('bigint', (value) => {
            try{
                value = BigInt(value);
            }catch{
                value = null;
            }
            return value;
        });
        TypeRepository.register('date', (value) => {
            const timestamp = Date.parse(value);
            return isNaN(timestamp) ? null : new Date(timestamp);
        });
        TypeRepository.register('array', (value, subType) => {
            if ( subType === null ){
                subType = 'string';
            }
            const values = value.split(',');
            // Process items the array is composed by.
            return values.length === 0 ? [] : Typify.typifyMultipleValues(values, subType);
        });
        TypeRepository.register('set', (value, subType) => {
            if ( subType === null ){
                subType = 'string';
            }
            const values = value.split(',');
            let castedValues;
            if ( values.length === 0 ){
                castedValues = new Set();
            }else{
                // Process items the set is composed by.
                castedValues = Typify.typifyMultipleValues(values, subType);
                if ( castedValues !== null ){
                    castedValues = new Set(castedValues);
                }
            }
            return castedValues;
        });
        TypeRepository.register('tuple', (value, subType) => {
            let types = subType === null ? [] : subType.split(',');
            if ( value.length > types.length ){
                // If a given value contains more entries that the ones defined in the sub-type, they will be handled as plain strings.
                types = types.fill('string', types.length, value.length - 1);
            }
            const values = value.split(','), length = values.length, mapping = {}, properties = {};
            for ( let i = 0 ; i < length ; i++ ){
                // Generate an object containing the tuple mapping.
                mapping[i] = types[i];
                // Generate an object that contains the entries extracted from the given value using current index as the entry name.
                properties[i] = values[i];
            }
            // Apply casting to the generated object.
            value = Typify.typify(mapping, properties);
            return value === null ? null : Object.values(value);
        });
    }
}

module.exports = TypeProvider;
