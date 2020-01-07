'use strict';

// Including third part modules.
const ejs = require('ejs');

// Including Lala's modules.
const Engine = require('./Engine');

/**
 * @typedef {EngineOptions} EjsEngineOptions An object representing all the options supported by the Ejs templating engine.
 *
 * @property {boolean} cache Compiled functions are cached, requires filename.
 * @property {string} filename Used by cache to key caches, and for includes.
 * @property {*} context Function execution context.
 * @property {boolean} compileDebug When false no debug instrumentation is compiled.
 * @property {*} client Returns standalone compiled function
 * @property {string} delimiter Character to use with angle brackets for open/close.
 * @property {boolean} debug Output generated function body.
 * @property {*} _with Whether or not to use with() {} constructs. If false then the locals will be stored in the locals object.
 * @property {string} localsName Name to use for the object storing local variables when not using with Defaults to locals.
 * @property {boolean} rmWhitespace Remove all safe-to-remove whitespace, including leading and trailing whitespace. It also enables a safer version of -%> line slurping for all scriptlet tags (it does not strip new lines of tags in the middle of a line).
 * @property {Function} escape The escaping function used with <%= construct. It is used in rendering and is .toString()ed in the generation of client functions. (By default escapes XML).
 * @property {string} outputFunctionName Set to a string (e.g., 'echo' or 'print') for a function to print output inside scriptlet tags.
 * @property {boolean} async When true, EJS will use an async function for rendering. (Depends on async/await support in the JS runtime.
 *
 * @see https://ejs.co/#docs
 */

/**
 * Renders a view file into plain HTML code using the Ejs templating engine.
 *
 * @see https://ejs.co
 */
class EjsEngine extends Engine {
    /**
     * The class constructor.
     */
    constructor(){
        super();
    }

    /**
     * Renders a given view file producing a plain HTML string.
     *
     * @param {string} path A string containing the path to the view file to render.
     * @param {Object.<string, *>} params Some additional parameters.
     * @param {?EjsEngineOptions} [options] Some additional options the templating engine should take care of.
     *
     * @returns {Promise<string>} A string containing the HTML code produced.
     *
     * @async
     */
    render(path, params, options = null) {
        options = Object.assign({}, this._options, options);
        return new Promise((resolve, reject) => {
            ejs.renderFile(path, params, options, (error, contents) => {
                return error === null ? resolve(contents) : reject(error);
            });
        });
    }
}

module.exports = EjsEngine;
