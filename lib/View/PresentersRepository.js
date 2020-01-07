'use strict';

// Including Lala's modules.
const BaseRepository = require('../Repository/BaseRepository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @callback PresenterCallback The callback function that implements the presenter's logic.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 * @param {...*} arguments All the other arguments that have been passed to the presenter function.
 *
 * @returns {string} A string containing the output to show up in view.
 */

/**
 * Allows to register new presenter function which allows to manipulate data in views.
 */
class PresentersRepository extends BaseRepository {
    /**
     * Registers a new presenter.
     *
     * @param {string} name A string representing the name of the presenter function.
     * @param {PresenterCallback} callback The function that implements the presenter.
     * @param {boolean} [overwrite=false] If set to "true" it means that if a function has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid presenter function is given.
     * @throws {InvalidArgumentException} If another function with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    static register(name, callback, overwrite = false){
        if ( typeof callback !== 'function' ){
            throw new InvalidArgumentException('Invalid presenter function.', 2);
        }
        super.register(name, callback, 'com.lala.view.presenter', overwrite);
    }

    /**
     * Removes a given presenter function from the repository.
     *
     * @param {string} name A string containing the name of the presenter function to remove.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.view.presenter');
    }

    /**
     * Checks if an object matching the given name has been registered or not.
     *
     * @param {string} name A string containing the name of the object to remove.
     *
     * @returns {boolean} If the object has been registered and found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.view.presenter');
    }

    /**
     * Returns the registered object matching the given key.
     *
     * @param {string} name A string containing the name of the object to remove.
     *
     * @returns {PresenterCallback} THe callback function that implements the presenter or null if no presenter matching the given name is found.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static get(name){
        return super.get(name);
    }

    /**
     * Returns all the objects that have been stored under a given namespace.
     *
     * @returns {Object.<string, PresenterCallback>} An object having as key the object name and as value the callback function that implements the presenter.
     */
    static getAll(){
        return super.getAll('com.lala.view.presenter');
    }
}

module.exports = PresentersRepository;
