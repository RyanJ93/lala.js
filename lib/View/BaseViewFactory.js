'use strict';

// Including Lala's modules.
const Factory = require('../Support/Factory');
const Cache = require('../Cache/Cache');
const ViewRepository = require('./ViewRepository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Allows to configure and generate views.
 *
 * @abstract
 */
class BaseViewFactory extends Factory {
    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the file that implements the view layout.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    constructor(path) {
        super();

        /**
         * @type {?string} [_path] A string containing the path to the file that implements the view layout.
         *
         * @protected
         */
        this._path = null;

        /**
         * @type {Set<string>} _assets A set containing the path to the additional assets required by this view.
         *
         * @protected
         */
        this._assets = new Set();

        /**
         * @type {boolean} [_caching=false] If set to "true" rendered outputs will be cached.
         *
         * @protected
         */
        this._caching = false;

        /**
         * @type {?Cache} [_cache] An instance of the class "Cache" representing the cache manager to use to store rendered outputs.
         *
         * @protected
         */
        this._cache = null;

        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._path = path;
    }

    /**
     * Sets the path to the view file, this method is chainable.
     *
     * @param {string} path A string containing the path.
     *
     * @returns {BaseViewFactory}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPath(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._path = path;
        return this;
    }

    /**
     * Returns the path to the view file.
     *
     * @returns {?string} A string containing the path or null if no path has been defined yet.
     */
    getPath(){
        return this._path;
    }

    /**
     * Adds an assets to the list of the assets required by the view, this method is chainable.
     *
     * @param {string} path A string containing the path to the asset file to add.
     *
     * @returns {BaseViewFactory}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    addAsset(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._assets.add(path);
        return this;
    }

    /**
     * Removes an asset from the list of the assets required by the view, this method is chainable.
     *
     * @param {string} path A string containing the path to the asset file to remove.
     *
     * @returns {BaseViewFactory}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    removeAsset(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._assets.delete(path);
        return this;
    }

    /**
     * Sets the list of all the assets required by the view, this method is chainable.
     *
     * @param {?Set<string>} assets A set containing the path to the asset files or null if no asset is required.
     *
     * @returns {BaseViewFactory}
     *
     * @throws {InvalidArgumentException} If an invalid set is given.
     */
    setAssets(assets){
        if ( assets !== null && !( assets instanceof Set ) ){
            throw new InvalidArgumentException('Invalid set.', 1);
        }
        // Drop currently defined assets and replace them with new ones.
        this.dropAssets();
        this._assets = assets;
        return this;
    }

    /**
     * Drops all the assets defined for the view, this method is chainable.
     *
     * @returns {BaseViewFactory}
     */
    dropAssets(){
        this._assets.clear();
        return this;
    }

    /**
     * Returns all the asset files required by the view.
     *
     * @returns {Set<string>} A set containing the path to the asset files defined.
     */
    getAssets(){
        return this._assets;
    }

    /**
     * Sets if rendered outputs should be cached or not, this method is chainable.
     *
     * @param {boolean} outputCaching If set to "true" rendered outputs will be cached.
     *
     * @return {BaseViewFactory}
     */
    setCaching(outputCaching){
        this._caching = outputCaching === true;
        return this;
    }

    /**
     * Returns if the rendered outputs are going to be cached or not.
     *
     * @return {boolean} If output caching is enabled will be returned "true".
     */
    getCaching(){
        return this._caching === true;
    }

    /**
     * Sets the cache manager to use to cache rendered outputs, this method is chainable.
     *
     * @param {?Cache} cache An instance of the class "Cache" representing the cache manager to use to store rendered outputs.
     *
     * @return {BaseViewFactory}
     *
     * @throws {InvalidArgumentException} If an invalid cache manager instance is given.
     */
    setCache(cache){
        if ( cache !== null && !( cache instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache manager instance.', 1);
        }
        this._cache = cache;
        return this;
    }

    /**
     * Returns the cache manager that has been defined to cache rendered outputs.
     *
     * @return {?Cache} An instance of the class "Cache" or null if no cache manager has been defined.
     */
    getCache(){
        return this._cache;
    }

    /**
     * Registers current view factory into the view repository, this method is chainable.
     *
     * @param {string} name A string containing the unique name of this view.
     * @param {boolean} [overwrite=false] If set to "true" it means that if a view has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If another view with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    register(name, overwrite = false){
        ViewRepository.register(name, this, overwrite);
        return this;
    }
}

module.exports = BaseViewFactory;
