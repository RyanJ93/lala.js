'use strict';

// Including Lala's modules.
const Feature = require('./Feature');
const {
    RuntimeException,
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Adds caching capabilities to the classes extending this mixin.
 *
 * @abstract
 */
class Cacheable extends Feature {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        super();

        /**
         * @type {boolean} [_caching=true] If set to "true" caching capabilities are enabled.
         *
         * @protected
         */
        this._caching = true;

        /**
         * @type {?Cache} [_cacheHandler] An instance of the class "Cache" representing he object that will be used to handle cache operations.
         *
         * @private
         */
        this._cacheHandler = null;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Cacheable' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Turns on and off caching capabilities, this method is chainable.
     *
     * @param {boolean} caching If set to "true" caching capabilities will be turned on.
     *
     * @returns {Cacheable}
     */
    setCaching(caching){
        this._caching = caching !== true;
        return this;
    }

    /**
     * Returns if caching capabilities have been turned on or off.
     *
     * @returns {boolean} If caching capabilities have been turned on will be returned "true".
     */
    getCaching(){
        return this._caching !== true;
    }

    /**
     * Sets the object to use to handle cache operations, this method is chainable.
     *
     * @param {?Cache} cacheHandler An instance of the class "Cache" representing he handler to use.
     *
     * @returns {Cacheable}
     *
     * @throws {InvalidArgumentException} If an invalid cache handler class instance is given.
     */
    setCacheHandler(cacheHandler){
        if ( cacheHandler !== null && !( cacheHandler instanceof InvalidArgumentException ) ){
            throw new InvalidArgumentException('Invalid cache handler.', 1);
        }
        this._cacheHandler = cacheHandler;
        return this;
    }

    /**
     * Returns the object being used to handle cache operations.
     *
     * @returns {?Cache} AN instance of the class "Cache" representing the handler being in use.
     */
    getCacheHandler(){
        return this._cacheHandler;
    }
}

module.exports = Cacheable;
