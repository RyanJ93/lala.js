'use strict';

// Including native modules.
const crypto = require('crypto');
const { Readable } = require('stream');

// Including Lala's modules.
const BaseViewFactory = require('./BaseViewFactory');
const CacheRepository = require('../Cache/CacheRepository');
const Cache = require('../Cache/Cache');
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
class BaseView {
    /**
     * @type {Object.<string, *>} _sharedParameters An object containing some parameter to share across all the views.
     * 
     * @protected
     */
    static _sharedParameters = {};

    /**
     * @type {boolean} [_globalCaching=true] If set to "false" rendered output won't be cached despite view instances configuration.
     *
     * @protected
     */
    static _globalCaching = true;

    /**
     * @type {?Cache} [_globalCache] An instance of the class "Cache" representing the cache manager to use whenever no manager is defined in view instance level.
     *
     * @protected
     */
    static _globalCache = null;

    /**
     * @type {boolean} [_useSourceRepository=true] If set to "true" sources will be cached internally after being loaded for the first time.
     *
     * @protected
     */
    static _useSourceRepository = true;

    /**
     * Adds a parameter to the list of parameters to share across all the views.
     *
     * @param {string} name A string containing the parameter name.
     * @param {*} value The parameter value.
     * @param {boolean} [overwrite=false] If set to "true" and if the given parameter name is already existing it will be overwritten, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     * @throws {InvalidArgumentException} If the given parameter already exist and the overwrite flag was set to false.
     */
    static addSharedParameter(name, value, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        if ( overwrite !== true && BaseView._sharedParameters.hasOwnProperty(name) ){
            throw new InvalidArgumentException('A parameter matching the same name has already been defined.', 2);
        }
        BaseView._sharedParameters[name] = value;
    }

    /**
     * Removes a parameter from the list of parameters to share across all the views.
     *
     * @param name A string containing the name of the parameter to remove.
     *
     * @throws {InvalidArgumentException} If an invalid parameter name is given.
     */
    static removeSharedParameter(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid parameter name.', 1);
        }
        delete BaseView._sharedParameters[name];
    }

    /**
     * Sets the parameters to share across all the views.
     *
     * @param {Object.<string, *>} parameters An object having as key the parameter name and as value its value.
     *
     * @throws {InvalidArgumentException} If an invalid Object is given.
     */
    static setSharedParameters(parameters){
        if ( parameters === null || typeof parameters !== 'object' ){
            throw new InvalidArgumentException('Invalid parameters.', 1);
        }
        BaseView._sharedParameters = parameters;
    }

    /**
     * Drops all the shared parameters defined.
     */
    static dropSharedParameters(){
        BaseView._sharedParameters = {};
    }

    /**
     * Returns all the shared parameters defined.
     *
     * @return {Object<string, *>} An object having as key the parameter name and as value its value.
     */
    static getSharedParameters(){
        return BaseView._sharedParameters;
    }

    /**
     * Sets if rendered output caching should be disabled globally.
     *
     * @param {boolean} globalCaching If set to "false" it means that rendered output caching will be disabled despite view instances settings.
     */
    static setGlobalCaching(globalCaching){
        BaseView._globalCaching = globalCaching === true;
    }

    /**
     * Returns if rendered output caching has been disabled globally.
     *
     * @return {boolean} If rendered output caching has been disabled will be returned "false".
     */
    static getGlobalCaching(){
        return BaseView._globalCaching === true;
    }

    /**
     * Sets the cache manager to use whenever no manager is declared in view instance.
     *
     * @param {?Cache} globalCache An instance of the class "Cache" representing the cache manager.
     *
     * @throws {InvalidArgumentException} If an invalid cache manager instance is given.
     */
    static setGlobalCache(globalCache){
        if ( globalCache !== null && !( globalCache instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache object.', 1);
        }
        BaseView._globalCache = globalCache;
    }

    /**
     * Returns the cache manager to use whenever no manager is declared in view instance.
     *
     * @return {?Cache} An instance of the class "Cache" representing the cache manager defined or null if none has been defined.
     */
    static getGlobalCache(){
        return BaseView._globalCache;
    }

    /**
     * Sets if sources can be loaded and cached internally after being loaded from their files for the first time.
     *
     * @param {boolean} useSourceRepository If set to "true" sources will be cached internally after being loaded for the first time.
     */
    static setUseSourceRepository(useSourceRepository){
        BaseView._useSourceRepository = useSourceRepository !== false;
    }

    /**
     * Returns if sources can be loaded and cached internally after being loaded from their files for the first time.
     *
     * @return {boolean} If sources can be loaded and cached will be returned "true".
     */
    static getUseSourceRepository(){
        return BaseView._useSourceRepository !== false;
    }

    /**
     * Wipes out all data related to rendered outputs that have been cached using the given cache manager instance.
     *
     * @param {Cache} handler An instance of the class "Cache" representing the cache manager.
     *
     * @return {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid cache manager instance is given.
     *
     * @async
     */
    static async invalidateGlobalCache(handler){
        if ( !( handler instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache handler.', 1);
        }
        await handler.invalidate({
            namespace: 'com.lala.view.output'
        });
    }

    /**
     * Returns the cache manager to use according to the configuration.
     *
     * @return {?Cache} An instance of the class "Cache" representing the cache manager or null if no caching layer should be applied.
     *
     * @protected
     */
    _getCacheHandler(){
        let cacheHandler = null;
        if ( BaseView._globalCaching && this._factory.getCaching() ){
            cacheHandler = this._factory.getCache();
            if ( cacheHandler === null ){
                cacheHandler = BaseView._globalCache;
                if ( cacheHandler === null ){
                    // TODO: Replace with "getAny".
                    cacheHandler = CacheRepository.get('@viewOutput');
                    if ( cacheHandler === null ){
                        cacheHandler = CacheRepository.get('@view');
                        if ( cacheHandler === null ){
                            cacheHandler = CacheRepository.get('@default');
                        }
                    }
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
        hash.update(this._factory.getPath());
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
                    namespace: 'com.lala.view.output'
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
                        namespace: 'com.lala.view.output'
                    }).catch((ex) => {
                        Logger.logError(ex);
                    });
                });
                stream.on('error', (error) => {
                    Logger.logError(error);
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
                namespace: 'com.lala.view.output'
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
                namespace: 'com.lala.view.output'
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
     * @param {BaseViewFactory} factory An instance of the class "BaseViewFactory" representing the factory where this class instance has been generated from.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     * @throws {InvalidArgumentException} If an invalid factory class instance is given.
     */
    constructor(factory){
        /**
         * @type {BaseViewFactory} _factory An instance of the class "BaseViewFactory" representing the factory where this class instance has been generated from.
         *
         * @protected
         */
        this._factory = factory;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'BaseView' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
        if ( !( this._factory instanceof BaseViewFactory ) ){
            throw new InvalidArgumentException('Invalid factory class.', 2);
        }
    }

    async invalidateCache(){
        // TODO: Implement this method once tagging support is added on cache side.
        throw new NotImplementedYetException('This method has not been implemented yet.', 1);
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
