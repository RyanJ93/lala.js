'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including Lala's modules.
const ParametrizedView = require('./ParametrizedView');
const Engine = require('./engines/Engine');
const EjsEngine = require('./engines/EjsEngine');
const Context = require('../Types/Context');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents a view.
 */
class View extends ParametrizedView {
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
        const hash = super._buildCacheKeyHash(factors);
        // Different engines render a view in different ways, add the engine name to the caching key.
        hash.update(this._engine.constructor.name);
        return hash;
    }

    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the view file.
     * @param {?Object.<string, *>} [params] An object containing some parameters to pass to the templating engine or null if no parameter should be passed.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid object containing parameters is given.
     */
    constructor(path, params = null){
        super(path, params);

        /**
         * @type {Engine} _engine An instance of the class that implements the templating engine in use, it must extend the "Engine" class.
         *
         * @protected
         */
        this._engine = new EjsEngine();
    }

    /**
     * Sets the templating engine to use to generate the HTML code from the view, this method is chainable.
     *
     * @param {Engine} engine An instance of the class that implements the templating engine, it must extend the "Engine" class.
     *
     * @returns {View}
     *
     * @throws {InvalidArgumentException} If an invalid templating engine instance is given.
     */
    setEngine(engine){
        if ( !( engine instanceof Engine ) ){
            throw new InvalidArgumentException('Invalid templating engine instance.', 1);
        }
        this._engine = engine;
        return this;
    }

    /**
     * Returns the templating engine to use to generate the HTML code from the view.
     *
     * @returns {Engine} An instance of the class that implements the templating engine that has been defined, by default "EjsEngine" is used.
     */
    getEngine(){
        return this._engine;
    }

    /**
     * Renders the view producing a stream as a result.
     *
     * @param {?Object.<string, *>} [parameters] Some additional on-the-fly parameters that will be merged into defined ones.
     * @param {?Context} [context] An instance of the class context containing the request and response objects obtained from a server.
     *
     * @returns {Promise<module:stream.internal.Readable>} A readable stream that returns the HTML code produced from the view.
     *
     * @throws {InvalidArgumentException} If the given parameters ar not a valid object.
     * @throws {InvalidArgumentException} If an invalid request context is given.
     *
     * @async
     */
    async renderAsStream(parameters = null, context = null){
        const contents = this.renderAsString(parameters, context);
        // Generate the stream object.
        const data = new Readable();
        data.push(await contents);
        // Close the stream.
        data.push(null);
        return data;
    }

    /**
     * Renders the view producing a string as a result.
     *
     * @param {?Object.<string, *>} [parameters] Some additional on-the-fly parameters that will be merged into defined ones.
     * @param {?Context} [context] An instance of the class context containing the request and response objects obtained from a server.
     *
     * @returns {Promise<string>} A string containing the HTML code generated from the view.
     *
     * @throws {InvalidArgumentException} If the given parameters ar not a valid object.
     * @throws {InvalidArgumentException} If an invalid request context is given.
     *
     * @async
     */
    async renderAsString(parameters = null, context = null){
        if ( typeof parameters !== 'object' ){
            throw new InvalidArgumentException('Invalid parameters.', 1);
        }
        if ( context !== null && !( context instanceof Context ) ){
            throw new InvalidArgumentException('Invalid context.', 2);
        }
        // Generate the parameters object to pass to the view.
        const mergedParameters = this._prepareParams(parameters, context);
        // Look up the view contents from the cache.
        let contents = await this._loadStringFromCache(mergedParameters.cacheFactors);
        if ( contents === null ){
            // Render the view to HTML code.
            contents = await this._engine.render(this._path, mergedParameters.all);
            this._storeStringInCache(contents, mergedParameters.cacheFactors);
        }
        return contents;
    }
}

module.exports = View;
