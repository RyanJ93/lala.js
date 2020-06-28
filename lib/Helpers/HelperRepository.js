'use strict';

// Including Lala's modules.
const BaseRepository = require('../Repository/BaseRepository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {Object} HelperInjectionOptions An object representing all the options accepted by the "inject" method of the "HelperRepository" class.
 *
 * @property {?*[]} bind An optional array of variable to bind to the helper function that will be injected.
 * @property {?Object.<*, *>} context An optional object containing some parameters that will be available as the first parameter in the helper function.
 */

/**
 * Allows to store and inject helper functions.
 */
class HelperRepository extends BaseRepository {
    /**
     * Registers a new helper function.
     *
     * @param {string} name A string containing the name of the helper function.
     * @param {function} func The helper function to register.
     * @param {?string} [namespace] A string containing a namespace for the function or null if it should be available globally.
     * @param {boolean} [overwrite=false] If set to "true" it means that if a function has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     * @throws {InvalidArgumentException} If another function having the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    static register(name, func, namespace = null, overwrite = false){
        if ( typeof func !== 'function' ){
            throw new InvalidArgumentException('Invalid function.', 2);
        }
        namespace = namespace === null || namespace === '' ? 'com.lala.helpers:*' : ( 'com.lala.helpers:' + namespace );
        super.register(name, func, namespace, overwrite);
    }

    /**
     * Removes a given a helper function.
     *
     * @param {string} name A string containing the name of the helper function to remove.
     * @param {?string} [namespace] A string containing the namespace the function has been registered in or null in case of a global function.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static remove(name, namespace = null){
        namespace = namespace === null || namespace === '' ? 'com.lala.helpers:*' : ( 'com.lala.helpers:' + namespace );
        super.remove(name, namespace);
    }

    /**
     * Checks if a given function has been registered.
     *
     * @param {string} name A string containing the name of the helper function.
     * @param {?string} [namespace] A string containing the namespace the function should be searched in.
     *
     * @returns {boolean} If the function is found will be returned "true".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static has(name, namespace = null){
        namespace = namespace === null || namespace === '' ? 'com.lala.helpers:*' : ( 'com.lala.helpers:' + namespace );
        return super.has(name, namespace);
    }

    /**
     * Returns a helper function given its name.
     *
     * @param {string} name A string containing the name of the helper function.
     * @param {?string} [namespace] A string containing the namespace the function.
     *
     * @returns {?function} The helper function or null if no helper matching the given name is found.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static get(name, namespace = null){
        namespace = namespace === null || namespace === '' ? 'com.lala.helpers:*' : ( 'com.lala.helpers:' + namespace );
        return super.get(name, namespace);
    }

    /**
     * Returns all the helper functions registered.
     *
     * @param {?string} [namespace] A string containing the namespace functions must have been registered in, if null all global helpers will be returned.
     *
     * @returns {Object<string, function>} An object having has key the function name and as value the corresponding function.
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static getAll(namespace = null){
        namespace = namespace === null || namespace === '' ? 'com.lala.helpers:*' : ( 'com.lala.helpers:' + namespace );
        return super.getAll(namespace);
    }

    /**
     * Injects all the helper function registered in a given namespace into a given object.
     * 
     * @param {Object} obj An object the helper functions found will be injected in.
     * @param {?string} [namespace] A string containing the namespace the functions.
     * @param {?HelperInjectionOptions} [options] An object containing some additional options this method should take care of.
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    static inject(obj, namespace = null, options = null){
        if ( obj === null || typeof obj !== 'object' ){
            throw new InvalidArgumentException('Invalid object.', 1);
        }
        if ( options !== null && typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 3);
        }
        namespace = namespace === null || namespace === '' ? 'com.lala.helpers:*' : ( 'com.lala.helpers:' + namespace );
        // Get all the helpers registered under the given namespace.
        const helpers = super.getAll(namespace);
        const bind = options !== null && Array.isArray(options.bind) ? options.bind : [this];
        if ( options !== null && options.context !== null && typeof options.context === 'object' ){
            // Context variables have been defined, add them as the first argument of the helper function.
            bind.splice(1, 0, options.context);
        }
        // Inject helper functions.
        // OPTIMIZE: Binding is slow, find a better alternative.
        for ( const name in helpers ){
            if ( helpers.hasOwnProperty(name) ){
                obj[name] = helpers[name].bind(...bind);
            }
        }
    }
}

module.exports = HelperRepository;
