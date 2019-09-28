'use strict';

// Including Lala's modules.
const {
    RuntimeException
} = require('../../Exceptions');

/**
 * @typedef {Object} ProcessorConfiguration An object containing all the properties of this class that will be setup on class has been instanced.
 */

/**
 * Allows to crete processor classes used as helpers in request processing phases.
 *
 * @abstract
 */
class Processor {
    /**
     * Returns all the class properties and their default values.
     *
     * @returns {{}} An object having as key the property name and as value its default value.
     */
    static getDefaultConfiguration(){
        return {};
    }

    /**
     * The class constructor.
     *
     * @param {?ProcessorConfiguration} [configuration=null] An object containing the configuration value for each class property.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(configuration = null){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Processor' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {ProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {Processor}
     */
    configure(configuration){
        return this;
    }
}

module.exports = Processor;
