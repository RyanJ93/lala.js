'use strict';

// Including Lala's modules.
const Factory = require('../../../Support/Factory');
const {
    RuntimeException
} = require('../../../Exceptions');

/**
 *
 *
 * @abstract
 */
class BaseDirectoryIndexerFactory extends Factory {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'BaseDirectoryIndexer' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }
}

module.exports = BaseDirectoryIndexerFactory;
