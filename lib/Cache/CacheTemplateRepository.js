'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Contains all the registered cache configuration templates.
 */
class CacheTemplateRepository extends Repository {
    /**
     * Registers a new cache configuration template.
     *
     * @param {string} name A string containing the template name, it must be unique.
     * @param {CacheTemplate} template An instance of the class "CacheTemplate" representing the configuration template.
     * @param {boolean} overwrite If set to "true" it means that if the template has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid template name is given.
     * @throws {InvalidArgumentException} If another template with the same name has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid configuration template class is given.
     */
    static register(name, template, overwrite = false){
        if ( template === null || typeof template !== 'object' || template.constructor.name !== 'CacheTemplate' ){
            throw new InvalidArgumentException('Invalid configuration template class.', 4);
        }
        super.register(name, template, 'com.lala.cache.template', overwrite);
    }

    /**
     * Removes a cache configuration template that has been registered.
     *
     * @param {string} name A string containing the template name.
     *
     * @throws {InvalidArgumentException} If an invalid template name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.cache.template');
    }

    /**
     * Checks if a cache configuration template matching a given name has been registered or not.
     *
     * @param {string} name A string containing the template name.
     *
     * @returns {boolean} If the cache template exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid template name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.cache.template');
    }

    /**
     * Returns the cache configuration template matching a given name.
     *
     * @param {string} name A string containing the template name.
     *
     * @returns {(CacheTemplate|null)} An instance of the class "CacheTemplate" representing the configuration template, if no object is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid template name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.cache.template');
    }

    /**
     * Returns all the cache configuration template that have been registered.
     *
     * @returns {{string: CacheTemplate}} An object having as key the object name and as value the cache configuration template itself.
     */
    static getAll(){
        return super.getAll('com.lala.cache.template');
    }
}

module.exports = CacheTemplateRepository;