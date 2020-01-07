'use strict';

// Including Lala's modules.
const Feature = require('./Feature');
const {
    RuntimeException
} = require('../../../Exceptions');

/**
 * Signals the class extending this mixin can be cloned.
 *
 * @abstract
 */
class Cloneable extends Feature {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Cloneable' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Clones current class instance.
     *
     * @returns {Cloneable} The cloned class instance.
     */
    clone(){
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}

module.exports = Cloneable;
