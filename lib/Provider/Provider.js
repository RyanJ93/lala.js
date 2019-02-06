'use strict';

// Including Lala's modules.
const {
    NotCallableException
} = require('../Exceptions');

/**
 * A model class used to define custom provider, a helpful way to install custom extensions into the framework.
 *
 * @abstract
 */
/* abstract */ class Provider {
    /**
     * Executes all the required configurations in order to integrate a functionality within the framework.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    static async setup(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Provider;