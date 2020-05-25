'use strict';

// Including Lala's modules.
const Controller = require('../Controller/Controller');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represent the couple controller class and method allowing to execute it in a more compact way than using a callback function.
 */
class ControllerClosure {
    /**
     * The class constructor.
     *
     * @param {Function} controllerClass The class the controller method belongs to, it must extends the "Controller" class.
     * @param {string} method A string containing the name of the controller method.
     *
     * @throws {InvalidArgumentException} If an invalid controller class is given.
     * @throws {InvalidArgumentException} If an invalid controller method name is given.
     */
    constructor(controllerClass, method) {
        /**
         * @type {Function} _controllerClass The class the controller method belongs to, it must extends the "Controller" class.
         *
         * @protected
         */
        this._controllerClass = controllerClass;

        /**
         * @type {string} _method A string containing the name of the controller method.
         *
         * @protected
         */
        this._method = method;

        if ( !( controllerClass.prototype instanceof Controller ) ){
            throw new InvalidArgumentException('Invalid controller class.', 1);
        }
        if ( typeof method !== 'string' || method === '' ){
            throw new InvalidArgumentException('Invalid controller method name.', 2);
        }
    }

    /**
     * Returns the controller class that has been defined.
     *
     * @returns {Function} The class the controller method defined belongs to.
     */
    getControllerClass(){
        return this._controllerClass;
    }

    /**
     * Returns the name of the controller method that has been defined.
     *
     * @returns {string} A string containing the name of the controller method.
     */
    getMethod(){
        return this._method;
    }

    /**
     * Executes the controller method defined.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {*} The controller output.
     */
    run(request, response){
        const instance = new this._controllerClass(request, response);
        return instance[this._method]();
    }
}

module.exports = ControllerClosure;
