'use strict';

// Including native modules.
const { EventEmitter } = require('events');

// Including Lala's modules.
const {
    RuntimeException
} = require('../Exceptions');

/**
 * Allows to create controllers according to the MVC pattern.
 *
 * @abstract
 */
class Controller extends EventEmitter {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Controller' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }
}

module.exports = Controller;
