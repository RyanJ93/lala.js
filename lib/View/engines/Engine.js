'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    NotCallableException,
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @typedef {Object} EngineOptions An object that contains some additional options the templating engine should take care of.
 */

/**
 * Allows to implement templating engines used to render views.
 *
 * @abstract
 */
class Engine {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        /**
         * @type {?EngineOptions} [_options] An object containing some custom options to pass to the templating engine when rendering views.
         *
         * @protected
         */
        this._options = null;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Engine' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Sets some custom option to pass to the templating engine when rendering views, this method is chainable.
     *
     * @param {?EngineOptions} options An object containing the options to pass or null if no options should be passed.
     *
     * @returns {Engine}
     *
     * @throws {InvalidArgumentException} If an invalid options object is given.
     */
    setOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 1);
        }
        this._options = options;
        return this;
    }

    /**
     * Returns the custom engine options defined.
     *
     * @returns {?EngineOptions} An object containing the options defined or null if no option has been defined.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Renders a given view file producing a plain HTML string.
     *
     * @param {string} path A string containing the path to the view file to render.
     * @param {Object.<string, *>} params Some additional parameters.
     * @param {?EngineOptions} [options] Some additional options the templating engine should take care of.
     *
     * @returns {Promise<string>} A string containing the HTML code produced.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async render(path, params, options = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Engine;
