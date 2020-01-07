'use strict';

// Including Lala's modules.
const Repository = require('../Repository/Repository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Stores views by name making them available globally.
 */
class ViewRepository extends Repository {
    /**
     * Registers a given view into the repository.
     *
     * @param {string} name A string containing the unique name of this view.
     * @param {BaseView} view An instance of the class that represents the view.
     * @param {boolean} [overwrite=false] If set to "true" it means that if a view has already been registered with the same name, it will be overwritten by current one, otherwise an exception will be thrown.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If an invalid view object is given.
     * @throws {InvalidArgumentException} If another view with the same name has already been registered and the "overwrite" option wasn't set to "true".
     */
    static register(name, view, overwrite = false){
        if ( !( view instanceof require('./BaseView') ) ){
            throw new InvalidArgumentException('Invalid view.', 2);
        }
        super.register(name, view, 'com.lala.view', overwrite);
    }

    /**
     * Removes a given view from the repository.
     *
     * @param {string} name A string containing the name of the view to remove.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static remove(name){
        super.remove(name, 'com.lala.view');
    }

    /**
     * Checks if a view matching the given name has been registered or not.
     *
     * @param {string} name A string containing the name of the view to remove.
     *
     * @returns {boolean} If the view has been registered and found will be returned "true", otherwise "false".
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static has(name){
        return super.has(name, 'com.lala.view');
    }

    /**
     * Returns the registered view matching the given key.
     *
     * @param {string} name A string containing the name of the view to remove.
     *
     * @returns {?BaseView} The view matching the key, if no view matching the given key is found will be returned null.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     */
    static get(name){
        return super.get(name, 'com.lala.view');
    }

    /**
     * Returns all the views that have been registered.
     *
     * @returns {Object.<string, BaseView>} An object having as key the view name and as value the view itself.
     */
    static getAll(){
        return super.getAll('com.lala.view');
    }

    /**
     * Sets the default view.
     *
     * @param {string} name A string containing the name of the view to use, note that it must have been registered first.
     *
     * @throws {InvalidArgumentException} If an invalid name is given.
     * @throws {InvalidArgumentException} If the given view has not been registered first.
     */
    static setDefault(name){
        super.setDefault(name, 'com.lala.view');
    }

    /**
     * Returns the default view defined.
     *
     * @returns {BaseView} The default view defined.
     *
     * @throws {BadMethodCallException} If no default view has been defined.
     * @throws {NotFoundException} If the default view defined doesn't exist anymore.
     */
    static getDefault(){
        return super.getDefault('com.lala.view');
    }

    /**
     * Removes the default view that has been defined, note that the original view won't be removed from the repository.
     */
    static dropDefault(){
        super.dropDefault('com.lala.view');
    }
}

module.exports = ViewRepository;
