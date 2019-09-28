'use strict';

// Including Lala's modules.
const {
    RuntimeException,
    NotCallableException
} = require('../Exceptions');

/**
 * Allows to implements policies that can be used to regulate route accesses to authenticated users.
 *
 * @abstract
 */
class Policy {
    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'Policy' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     *
     *
     * @param {*} user A custom object representing the user currently authenticated as of provided to the authenticator object.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If given user can access to the resource should be returned "true", otherwise "false" should be returned to cause a 403 HTTP code to be returned (a custom exception can be even thrown).
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async authorize(user, request, response){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = Policy;
