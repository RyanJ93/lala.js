'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 *
 */
class ResourceRoute extends BaseRoute {
    /**
     * The class constructor.
     *
     * @param path A string containing the path
     * @param location
     */
    constructor(path, location){
        super();

        /**
         * @type {(string|null)} _location A string containing the path to the directory where resource assets are located at.
         *
         * @private
         */
        this._location = null;

        // As all requests must be done using the GET HTTP method, changing method is not allowed.
        this._method = 'GET';
        delete this.setMethod;
        this._allowParameters = false;
        // Set given parameters.
        if ( path !== '' && typeof path === 'string' ){
            this.setPath(path);
        }
        if ( location !== '' && typeof location === 'string' ){
            this.setLocation(location);
        }
    }

    /**
     * Sets the location where resource assets are located at, this method is chainable.
     *
     * @param {string} location A string containing the path to the directory.
     *
     * @return {ResourceRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setLocation(location){
        if ( location === '' || typeof location !== 'string' ){
            throw new InvalidArgumentException('Invalid location path.', 1);
        }
        this._location = location;
        return this;
    }

    /**
     * Returns the location where resource assets are located at.
     *
     * @return {(string|null)} A string containing the path to the directory or null if no path has been defined yet.
     */
    getLocation(){
        return this._location;
    }
}

module.exports = ResourceRoute;
