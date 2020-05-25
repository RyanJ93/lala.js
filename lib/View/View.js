'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including Lala's modules.
const ParametrizedView = require('./ParametrizedView');
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
        hash.update(this._factory.getEngine().constructor.name);
        return hash;
    }

    /**
     * The class constructor.
     *
     * @param {ViewFactory} factory An instance of the class "ViewFactory" representing the factory where this class instance has been generated from.
     * @param {?Object.<string, *>} [params] An object containing some parameters to pass to the templating engine or null if no parameter should be passed.
     * @param {?Context} [context] An instance of the class context containing the request and response objects obtained from a server.
     *
     * @throws {InvalidArgumentException} If an invalid object containing parameters is given.
     * @throws {InvalidArgumentException} If an invalid factory class instance is given.
     */
    constructor(factory, params = null, context = null){
        super(factory, params, context);
    }

    /**
     * Renders the view producing a stream as a result.
     *
     * @returns {Promise<module:stream.internal.Readable>} A readable stream that returns the HTML code produced from the view.
     *
     * @throws {InvalidArgumentException} If the given parameters ar not a valid object.
     * @throws {InvalidArgumentException} If an invalid request context is given.
     *
     * @async
     */
    async renderAsStream(){
        const contents = this.renderAsString();
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
     * @returns {Promise<string>} A string containing the HTML code generated from the view.
     *
     * @throws {InvalidArgumentException} If the given parameters ar not a valid object.
     * @throws {InvalidArgumentException} If an invalid request context is given.
     *
     * @async
     */
    async renderAsString(){
        // Generate the parameters object to pass to the view.
        const mergedParameters = this._prepareParams();
        // Look up the view contents from the cache.
        let contents = await this._loadStringFromCache(mergedParameters.cacheFactors);
        if ( contents === null ){
            // Render the view to HTML code.
            contents = await this._factory.getEngine().render(this._factory.getPath(), mergedParameters.all);
            this._storeStringInCache(contents, mergedParameters.cacheFactors);
        }
        return contents;
    }
}

module.exports = View;
