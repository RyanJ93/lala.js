'use strict';

// Including Lala's modules.
const Mixin = require('../../Support/Mixin');
const HeaderManager = require('../../Server/HTTPHeaderManagers/HeaderManager');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Allows classes to handle HTTP header managers in order to manipulate the headers to return in client responses.
 *
 * @mixin
 */
class HeaderManagement extends Mixin {
    /**
     * The class constructor.
     */
    constructor() {
        super();

        /**
         * @type {HeaderManager[]} _headerManagers An array containing the header managers to execute when building the client response.
         *
         * @protected
         */
        this._headerManagers = [];
    }

    /**
     * Sets the header managers to execute when building the client response, this method is chainable.
     *
     * @param {HeaderManager[]} headerManagers An array containing the header managers as instances of the manager class, which must extend the "HeaderManager" class.
     *
     * @returns {HeaderManagement}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setHeaderManagers(headerManagers){
        if ( !Array.isArray(headerManagers) ){
            throw new InvalidArgumentException('Invalid header managers array.', 1);
        }
        this._headerManagers = headerManagers;
        return this;
    }

    /**
     * Returns the header managers to execute when building the client response.
     *
     * @returns {HeaderManager[]} An array containing the header managers that have been defined.
     */
    getHeaderManagers(){
        return this._headerManagers;
    }
}

module.exports = HeaderManagement;
