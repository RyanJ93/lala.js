'use strict';

// Including Lala's modules.
const {
    NotCallableException,
    RuntimeException
} = require('../Exceptions');

/**
 * Allows the definition of factory classes, the ones used to generate and configure other objects.
 *
 * @abstract
 */
class Factory {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Factory' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Generates a new instance of the class.
     *
     * @returns {*} The generated class instance.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     */
    craft(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Factory;
