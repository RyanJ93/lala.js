'use strict';

// Including native modules.
const crypto = require('crypto');
const { Readable } = require('stream');

// Including Lala's modules.
const ViewRepository = require('./ViewRepository');
const CacheRepository = require('../Cache/CacheRepository');
const Cache = require('../Cache/Cache');
const Cloneable = require('../Support/mixins/features/Cloneable');
const Logger = require('../Logger/Logger');
const {
    InvalidArgumentException,
    RuntimeException,
    NotCallableException,
    NotImplementedYetException
} = require('../Exceptions');

/**
 * Allow to create classes representing views.
 *
 * @abstract
 */
class BaseView extends Cloneable {
    /**
     * Removes all cached data related to any views within a given cache handler.
     *
     * @param {Cache} handler An instance of the class "Cache" representing the cache handler to use
     *
     * @returns {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid cache handler instance is given.
     *
     * @async
     */
    static async invalidateGlobalCache(handler){
        if ( !( handler instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache handler.', 1);
        }
        await handler.invalidate({
            namespace: 'com.lala.view'
        });
    }

    /**
     * Returns the cache handler to use.
     *
     * @returns {?Cache} An instance of the class "Cache" representing the cache handler to use to stored cache versions of the view.
     *
     * @protected
     */
    _getCacheHandler(){
        let cacheHandler = null;
        if ( this._cache === true ){
            cacheHandler = this._cacheHandler;
            if ( cacheHandler === null ){
                cacheHandler = CacheRepository.get('@view');
                if ( cacheHandler === null ){
                    cacheHandler = CacheRepository.get('@default');
                }
            }
        }
        return cacheHandler;
    }

    /**
     * Generates the key used to store the rendered view within the cache.
     *
     * @param {?Object.<string, *>} factors An optional object containing some additional parameters cache key should take care of in order to get a better uniqueness.
     *
     * @returns {Hash} An instance of the built-in class "Hash" representing the hash being constructed.
     *
     * @protected
     */
    _buildCacheKeyHash(factors){
        const hash = crypto.createHash('sha1');
        // Use the view path as an unique identifier for caching.
        hash.update(this._path);
        if ( factors !== null && typeof factors === 'object' ){
            // Attache some additional given properties used to increment key uniqueness.
            hash.update(JSON.stringify(factors));
        }
        return hash;
    }

    /**
     * Saves a given HTML rendered output into the cache (if enabled).
     *
     * @param {string} renderedOutput A string containing the plain HTML output obtained from rendering.
     * @param {?Object.<string, *>} factors An optional object containing some additional parameters cache key should take care of in order to get a better uniqueness.
     *
     * @protected
     */
    _storeStringInCache(renderedOutput, factors){
        const cacheHandler = this._getCacheHandler();
        if ( cacheHandler !== null ){
            // If a caching is enabled and a cache handler is found, save this view's data into the cache as soon as possible.
            setImmediate(() => {
                // Get the caching key.
                const key = this._buildCacheKeyHash(factors).digest('hex');
                cacheHandler.set(key, renderedOutput, {
                    overwrite: true,
                    namespace: 'com.lala.view'
                }).catch((ex) => {
                    Logger.logError(ex);
                });
            });
        }
    }

    /**
     * Gets a rendered HTML string from the cache and then returns it as a readable stream.
     *
     * @param {Promise<?module:stream.internal.Readable>} stream The readable stream HTML data come from.
     * @param {?Object.<string, *>} factors An optional object containing some additional parameters cache key should take care of.
     *
     * @protected
     */
    _storeStreamInCache(stream, factors){
        const cacheHandler = this._getCacheHandler();
        if ( cacheHandler !== null ){
            // Get the caching key.
            const key = this._buildCacheKeyHash(factors).digest('hex');
            setImmediate(() => {
                let renderedOutput = '';
                // Loads HTML data from the given stream.
                stream.on('data', (data) => {
                    renderedOutput += data.toString();
                });
                stream.on('end', () => {
                    // Loading completed, save data into the cache.
                    cacheHandler.set(key, renderedOutput, {
                        overwrite: true,
                        namespace: 'com.lala.view'
                    }).catch((ex) => {
                        Logger.logError(ex);
                    });
                });
                stream.on('error', (error) => {
                    Logger.logError(ex);
                });
            });
        }
    }

    /**
     * Gets a rendered HTML string from the cache and then returns it as a string.
     *
     * @param {?Object.<string, *>} factors An optional object containing some additional parameters that have been used to achieve better uniqueness iin caching key generation.
     *
     * @returns {Promise<?string>} A string containing the HTML rendered view found or null if no cached data is found.
     *
     * @protected
     */
    async _loadStringFromCache(factors){
        let renderedOutput = null;
        const cacheHandler = this._getCacheHandler();
        if ( cacheHandler !== null ){
            // Get the caching key.
            const key = this._buildCacheKeyHash(factors).digest('hex');
            // Fetch cached item.
            renderedOutput = await cacheHandler.get(key, {
                silent: true,
                namespace: 'com.lala.view'
            });
        }
        return renderedOutput;
    }

    /**
     * Gets a rendered HTML string from the cache and then returns it as a readable stream.
     *
     * @param {?Object.<string, *>} factors An optional object containing some additional parameters that have been used to achieve better uniqueness iin caching key generation.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A readable stream that yields the HTML rendered view found or null if no cached data is found.
     *
     * @protected
     */
    async _loadStreamFromCache(factors){
        let renderedOutput = null;
        const cacheHandler = this._getCacheHandler();
        if ( cacheHandler !== null ){
            // Get the caching key.
            const key = this._buildCacheKeyHash(factors).digest('hex');
            // Fetch cached item.
            const contents = await cacheHandler.get(key, {
                silent: true,
                namespace: 'com.lala.view'
            });
            if ( contents !== null ){
                // Generate the stream object.
                renderedOutput = new Readable();
                renderedOutput.push(contents);
                // Close the stream.
                renderedOutput.push(null);
            }
        }
        return renderedOutput;
    }

    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the view file.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    constructor(path){
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
         * @type {?Cache} [_cacheHandler] An instance of the class "Cache" representing the handler used to store rendered views.
         *
         * @protected
         */
        this._cacheHandler = null;

        /**
         * @type {boolean} [_cache=true] If set to "true" rendered views will be cached for next uses.
         *
         * @protected
         */
        this._cache = true;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'BaseView' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
        this.setPath(path);
    }

    /**
     * Sets the path to the view file, this method is chainable.
     *
     * @param {string} path A string containing the path.
     *
     * @returns {BaseView}
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
     * @returns {BaseView}
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
     * @returns {BaseView}
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
     * @returns {BaseView}
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
     * @returns {BaseView}
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
     * Sets the handler to use to store rendered views, this method is chainable.
     *
     * @param {?Cache} cacheHandler An instance of the class "Cache" representing the handler to use.
     *
     * @returns {BaseView}
     *
     * @throws {InvalidArgumentException} If an invalid handler class is given.
     */
    setCacheHandler(cacheHandler){
        if ( cacheHandler !== null && !( cacheHandler instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache handler.', 1);
        }
        this._cacheHandler = cacheHandler;
        return this;
    }

    /**
     * The cache handler class that has been defined.
     *
     * @returns {?Cache} An instance of the class "Cache" representing the handler or null if no handler has been defined.
     */
    getCacheHandler(){
        return this._cacheHandler;
    }

    /**
     * Sets if rendered views should be cached, this method is chainable.
     *
     * @param {boolean} cache If set to "true" rendered views will be cached for next uses.
     *
     * @returns {BaseView}
     */
    setCache(cache){
        this._cache = cache !== true;
        return this;
    }

    /**
     * Returns if rendered views will be cached or not.
     *
     * @returns {boolean} If views will be cached will be returned "true".
     */
    getCache(){
        return this._cache !== true;
    }

    /**
     * Registers current view into the view repository, this method is chainable.
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

    /**
     * Removes cached data related to this view.
     *
     * @returns {Promise<void>}
     *
     * @throws {NotImplementedYetException} This method cannot be used as of now because it has not been implemented yet.
     *
     * @async
     */
    async invalidateCache(){
        // TODO: Implement this method once tagging support is added on cache side.
        throw new NotImplementedYetException('This method has not been implemented yet.');
    }

    /**
     * Renders the view producing a stream as a result.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A readable stream that returns the HTML code produced from the view.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async renderAsStream(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Renders the view producing a string as a result.
     *
     * @returns {Promise<string>} A string containing the HTML code generated from the view.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async renderAsString(){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = BaseView;
