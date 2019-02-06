'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const {
    SerializationException,
    ParseException
} = require('./Exceptions');

/**
 * Generates an UUID according to the given version number.
 *
 * @param {number} version An integer number greater than zero an lower or equal than 5 representing the UUID version, if an invalid version is given, an UUID verion 4 will be generated instead.
 * @param {boolean} secure If set to "true", UUID's digits will be generated as cryptographically secure, otherwise not.
 *
 * @return {string} A string containing the generated UUID.
 */
module.exports.generateUUID = (version, secure = false) => {
    switch ( version ){
        default:{
            // Generating an UUID version 4.
            let components = ['', '', '4', '', ''];
            let values = ['8', '9', 'a', 'b'];
            components[3] = values[Math.floor(Math.random() * 4)];
            return [8, 4, 3, 3, 12].map((element, index) => {
                for ( let i = 0 ; i < element ; i++ ){
                    components[index] += Math.floor(Math.random() * 16).toString(16);
                }
                return components[index];
            }).join('-');
        };
    }
};

/**
 * Loads all the modules found within a given directory.
 *
 * @param {string} path A string containing the directory path.
 * @param {boolean} [recursive] If set to "true" it means that all subdirectory found will be included too.
 *
 * @return {object} An object containing all the artifacts found.
 */
module.exports.requireDir = (path, recursive = false) => {
    let artifacts = {};
    filesystem.readdirSync(path).forEach((element) => {
        if ( element.substr(element.lastIndexOf('.') + 1).toLowerCase() === 'js' ){
            let imports = require('.' + path + '/' + element);
            switch ( typeof(imports) ){
                case 'object':{
                    if ( imports !== null ){
                        artifacts = Object.assign(artifacts, imports);
                    }
                }break;
                case 'function':{
                    artifacts[imports.name] = imports;
                }break;
            }
        }else if ( recursive === true && filesystem.lstatSync(path + '/' + element).isDirectory() === true ){
            let imports = requireDir(path + '/' + element, true);
            artifacts = Object.assign(artifacts, imports);
        }
    });
    return artifacts;
};

/**
 * Serializes the given value into a JSON string representation.
 *
 * @param {*} value An arbitrary value that should be serialized into a string.
 *
 * @returns {{dataType: string, dataTypeCode: number, value: string}} An object containing the serialization components, such as the serialized value and the value's data type.
 *
 * @throws {SerializationException} If a function is given as value to be serialized.
 * @throws {SerializationException} If an unsupported value to serialize is given.
 */
module.exports.serialize = (value) => {
    // Use this object definition as reference for the numeric code used in "datatype" field in database table.
    const dataTypes = {
        ['undefined']: 1,
        ['null']: 2,
        ['object']: 3,
        ['boolean']: 4,
        ['number']: 5,
        ['string']: 6,
        ['array']: 7,
        ['bigint']: 8
    };
    // A stupid workaround to turn off a WebStorm's warning.
    let dataType = String(typeof value);
    if ( dataType === 'function' ){
        //TODO: Consider function serialization support using the "toSource" method.
        throw new SerializationException('Functions cannot be serialized and stored as a string representation.', 1);
    }
    if ( !dataTypes.hasOwnProperty(dataType) ){
        throw new SerializationException('Unsupported datatype.', 2);
    }
    let dataTypeCode = dataTypes[dataType];
    // Apply corrections for the data type found.
    if ( value === null ){
        dataTypeCode = 2;
        dataType = 'null';
    }
    if ( Array.isArray(value) ){
        dataTypeCode = 7;
        dataType = 'array';
    }
    let serialization = '';
    // Serialize the original data.
    switch ( dataTypeCode ){
        case 3:
        case 7:{
            serialization = JSON.stringify(value);
        }break;
        case 4:{
            serialization = value ? 'true' : 'false';
        }break;
        case 5:
        case 8:{
            serialization = value.toString();
        }break;
        case 6:{
            serialization = value;
        }break;
    }
    return {
        value: serialization,
        dataType: dataType,
        dataTypeCode: dataTypeCode
    };
};

/**
 * Converts a JSON string representation of a value into the original one.
 *
 * @param {string} value A string representing the serialized value to covert.
 * @param {number} dataType An integer number greater than zero representing the original data type.
 *
 * @returns {*} The original value.
 *
 * @throws {ParseException} If an error occurs during the unserialization process.
 */
module.exports.unserialize = (value, dataType) => {
    try{
        let unserialization = dataType === 1 ? undefined : null;
        switch ( dataType ){
            case 3:
            case 7:{
                unserialization = JSON.parse(value);
            }break;
            case 4:{
                unserialization = value === 'true';
            }break;
            case 5:{
                unserialization = parseFloat(value);
            }break;
            case 6:{
                unserialization = value;
            }break;
            case 8:{
                unserialization = BigInt(value);
            }break;
        }
        return unserialization;
    }catch(ex){
        throw new ParseException('Your data seems to be malformed.', 1, ex);
    }
};