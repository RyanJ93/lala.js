'use strict';

// Including Lala's modules.
const Factory = require('../../../Support/Factory');
const {
    NotCallableException,
    RuntimeException
} = require('../../../Exceptions');

/**
 * Allows to create factory classes used to generate instances of processor classes based on some defined configuration settings.
 *
 * @abstract
 */
class ProcessorFactory extends Factory {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'ProcessorFactory' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        /**
         * @type {ProcessorConfiguration} _properties An object containing all the properties accepted by the processor class to build up and their default values.
         *
         * @protected
         */
        this._properties = {};
    }

    /**
     * Generates a new instance of the processor class configuring it according to defined settings.
     *
     * @returns {Processor} An instance of the processor class generated based on defined configuration.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    craft(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = ProcessorFactory;
