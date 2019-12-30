'use strict';

// Including native modules.
const filesystem = require('fs');
const crypto = require('crypto');

// Including Lala's modules.
const HelperRepository = require('../HelperRepository');
const {
    NotImplementedYetException,
    SerializationException,
    ParseException,
    InvalidArgumentException,
    RuntimeException
} = require('../../Exceptions');

/**
 * Generates an UUID according to the given version number.
 *
 * @param {number} version An integer number greater than zero an lower or equal than 5 representing the UUID version, if an invalid version is given, an UUID version 4 will be generated instead.
 * @param {boolean} [secure=false] If set to "true", UUID's digits will be generated as cryptographically secure, otherwise not.
 *
 * @return {string} A string containing the generated UUID.
 *
 * @throws {NotImplementedYetException} If given version is 1, 2, 3 or 5.
 * @throws {InvalidArgumentException} If an invalid version is given.
 */
function generateUUID(version, secure = false){
    let uuid = '';
    switch ( version ){
        case 1:
        case 2:
        case 3: {
            throw new NotImplementedYetException('Given UUID version is currently not supported.', 1);
        }
        case 4: {
            // Generating an UUID version 4.
            const components = ['', '', '4', '', ''];
            const values = ['8', '9', 'a', 'b'];
            components[3] = values[Math.floor(Math.random() * 4)];
            uuid = [8, 4, 3, 3, 12].map((element, index) => {
                for ( let i = 0 ; i < element ; i++ ){
                    components[index] += Math.floor(Math.random() * 16).toString(16);
                }
                return components[index];
            }).join('-');
        }break;
        case 5: {
            throw new NotImplementedYetException('Given UUID version is currently not supported.', 1);
        }
        default: {
            throw new InvalidArgumentException('Invalid UUID version.', 2);
        }
    }
    return uuid;
}

/**
 * Generates a cryptographically secure token.
 *
 * @param {number} length An integer number greater than zero representing the token length.
 *
 * @returns {Promise<string>} A string containing the generated token.
 *
 * @throws {InvalidArgumentException} If an invalid length is given.
 * @throws {RuntimeException} If an error occurs during the token generation.
 */
function generateToken(length){
    if ( length === null || isNaN(length) || length <= 0 ){
        throw new InvalidArgumentException('Invalid token length.', 1);
    }
    return new Promise((resolve, reject) => {
        // Get cryptographically secure bytes.
        crypto.randomBytes(length / 2, (error, bytes) => {
            if ( error !== null ){
                return reject(new RuntimeException('Unable to generate the token.', 1, error));
            }
            // Create an hexadecimal string representation.
            resolve(bytes.toString('hex'));
        });
    });
}

/**
 * Loads all the modules found within a given directory.
 *
 * @param {string} path A string containing the directory path.
 * @param {boolean} [recursive=false] If set to "true" it means that all subdirectory found will be included too.
 *
 * @return {Object.<string, *>} An object containing all the artifacts found.
 */
function requireDir(path, recursive = false){
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
}

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
function serialize(value){
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
}

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
function unserialize(value, dataType){
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
}

/**
 * Mixed multiple given classes into a single one.
 *
 * @param {...function} mixins One or more classes to mix.
 *
 * @return {function} The generated class.
 */
function mixin(...mixins){
    const length = mixins.length;
    const BaseClass = mixins[0];
    class Base extends BaseClass {
        constructor (...args) {
            super(...args);
            for ( let i = 0 ; i < length ; i++ ){
                copyProps(this, new mixins[i]);
            }
        }
    }
    const copyProps = (target, source) => {
        let properties = Object.getOwnPropertySymbols(source);
        properties = Object.getOwnPropertyNames(source).concat(properties);
        const length = properties.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( typeof properties[i] !== 'string' || !properties[i].match(/^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/) ){
                const descriptor = Object.getOwnPropertyDescriptor(source, properties[i]);
                Object.defineProperty(target, properties[i], descriptor);
            }
        }
    };
    for ( let i = 0 ; i < length ; i++ ){
        copyProps(Base.prototype, mixins[i].prototype);
        copyProps(Base, mixins[i]);
    }
    return Base;
}

/**
 * Checks if the given object is empty or not.
 *
 * @param {Object} obj Some object to test.
 *
 * @returns {boolean} If the given object has no property will be returned "true".
 *
 * @throws {InvalidArgumentException} If an invalid object is given.
 */
function isEmptyObject(obj){
    if ( obj === null || typeof obj !== 'object' ){
        throw new InvalidArgumentException('Invalid object.', 1);
    }
    let empty = true;
    for ( const key in obj ){
        if ( obj.hasOwnProperty(key) ){
            empty = false;
            break;
        }
    }
    return empty;
}

/**
 * Generates a string representation of a given size value.
 *
 * @param {number} value An integer number greater than zero representing the size value in bytes.
 *
 * @returns {string} A string representing the generated representation.
 */
function sizeToHumanReadableValue(value){
    let representation = '';
    if ( value > 1024 ){
        value = Math.floor(value / 1024);
        if ( value > 1024 ){
            value = Math.floor(value / 1024);
            if ( value > 1024 ) {
                value = Math.floor(value / 1024);
                if ( value > 1024 ) {
                    representation = value > 1024 ? ( Math.floor( value / 1024 ) + ' Pb' ) : ( value + ' Tb' );
                }else{
                    representation = value + ' Gb';
                }
            }else{
                representation = value + ' Mb';
            }
        }else{
            representation = value + ' Kb';
        }
    }else{
        representation = value + ' b';
    }
    return representation;
}

module.exports.registerHelpers = () => {
    HelperRepository.register('generateUUID', generateUUID);
    HelperRepository.register('generateToken', generateToken);
    HelperRepository.register('requireDir', requireDir);
    HelperRepository.register('serialize', serialize);
    HelperRepository.register('unserialize', unserialize);
    HelperRepository.register('mixin', mixin);
    HelperRepository.register('isEmptyObject', isEmptyObject);
    HelperRepository.register('sizeToHumanReadableValue', sizeToHumanReadableValue);
};

module.exports.generateUUID = generateUUID;
module.exports.generateToken = generateToken;
module.exports.requireDir = requireDir;
module.exports.serialize = serialize;
module.exports.unserialize = unserialize;
module.exports.mixin = mixin;
module.exports.isEmptyObject = isEmptyObject;
module.exports.sizeToHumanReadableValue = sizeToHumanReadableValue;
