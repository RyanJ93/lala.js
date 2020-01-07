'use strict';

// Including Lala's modules.
const Mixin = require('../../Mixin');
const {
    RuntimeException
} = require('../../../Exceptions');

/**
 * Allows to create mixins that adds some features to target classes.
 *
 * @abstract
 */
class Feature extends Mixin {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Feature' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }
}

module.exports = Feature;
