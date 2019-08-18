'use strict';

// Including Lala's modules.
const { Repository } = require('../Repository');
const {
    InvalidArgumentException,
    MisconfigurationException
} = require('../Exceptions');

/**
 * Contains all the registered routers.
 */
class RouterRepository extends Repository {
    /**
     * Registers a new router.
     *
     * @param {string} name A string containing the router name.
     * @param {Router} router An instance of the class "Router" representing the router.
     * @param {boolean} [overwrite=false]  If set to "true" it means that if the router has already been registered, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid router name is given.
     * @throws {InvalidArgumentException} If another router with the same name has already been registered and the "overwrite" option wasn't set to "true".
     * @throws {InvalidArgumentException} If an invalid router class is given.
     */
    static register(name, router, overwrite = false){
        if ( router === null || typeof router !== 'object' || router.constructor.name !== 'Router' ){
            throw new InvalidArgumentException('Invalid router class.', 4);
        }
        super.register(name, router, 'com.lala.router', overwrite);
    }

    /**
     * Removes a router that has been registered.
     *
     * @param {string} name A string containing the router name.
     *
     * @throws {InvalidArgumentException} If an invalid router name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.router');
    }

    /**
     * Checks if a router matching a given name has been registered or not.
     *
     * @param {string} name A string containing the router name.
     *
     * @returns {boolean} If the router exists will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid router name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.router');
    }

    /**
     * Returns the router matching a given name.
     *
     * @param {string} name A string containing the router name.
     *
     * @returns {?Router} An instance of the class "Router" representing the router, if no object is found, null will be returned instead.
     *
     * @throws {InvalidArgumentException} If an invalid router name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.router');
    }

    /**
     * Returns all the routers that have been registered.
     *
     * @returns {Object.<string, Router>} An object having as key the object name and as value the router itself.
     */
    static getAll(){
        return super.getAll('com.lala.router');
    }

    /**
     * Sets the default router to use.
     *
     * @param {string} name A string containing the name of the router to use, note that the given router must have been registered first.
     */
    static setDefault(name){
        super.setDefault(name, 'com.lala.router');
    }

    /**
     * Returns the default router to use.
     *
     * @returns {Router} An instance of the class "Router" representing the default router.
     *
     * @throws {MisconfigurationException} If no default router has been found or no default router has been defined yet.
     */
    static getDefault(){
        try{
            return super.getDefault('com.lala.router');
        }catch{
            throw new MisconfigurationException('No default router found.', 1);
        }
    }
}

module.exports = RouterRepository;
