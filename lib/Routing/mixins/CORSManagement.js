'use strict';

// Including Lala's modules.
const Mixin = require('../../Support/Mixin');
const CORSOptions = require('../../Server/support/CORSOptions');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 *
 */
class CORSManagement extends Mixin {
    /**
     * The class constructor.
     */
    constructor() {
        super();

        /**
         * @type {?CORSOptions} [_CORSOptions] An instance of the class "CORSOptions" containing the CORS configuration to use.
         *
         * @protected
         */
        this._CORSOptions = null;
    }

    /**
     * Sets the CORS configuration to use, this method is chainable.
     *
     * @param {?CORSOptions} options An instance of the "CORSOptions" class representing the CORS configuration or null if CORS shouldn't be enabled.
     *
     * @returns {CORSManagement}
     *
     * @throws {InvalidArgumentException} If an invalid class instance is given.
     */
    setCORSOptions(options){
        if ( options !== null && !( options instanceof CORSOptions ) ){
            throw new InvalidArgumentException('Invalid CORS options.', 1);
        }
        this._CORSOptions = options;
        return this;
    }

    /**
     * Returns the CORS configuration defined.
     *
     * @returns {?CORSOptions} An instance of the "CORSOptions" class or null if no configuration has been defined.
     */
    getCORSOptions(){
        return this._CORSOptions;
    }
}

module.exports = CORSManagement;
