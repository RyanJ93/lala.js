'use strict';

// Including Lala's modules.
const Credentials = require('../../Types/Credentials');
const {
    RuntimeException,
    NotCallableException
} = require('../../Exceptions');

/**
 * Represents the base to define a class that allows to provide and lookup user credentials based on user IDs.
 *
 * @abstract
 */
class CredentialsProvider {
    /**
     * Generates an object representation of the given credentials.
     *
     * @param {string} identifier A string representing the unique user identifier.
     * @param {*} credentials An arbitrary representation of the user credentials that will be converted into a standard form.
     *
     * @returns {?Credentials} An instance of the class "Credentials" representing the given credentials converted into a standard form.
     *
     * @protected
     */
    static _generateCredentialsObject(identifier, credentials){
        // Check if the given credentials are already an instance of the class "Credentials", is this case, no processing is needed.
        let credentialsObject = credentials instanceof Credentials ? credentials : null;
        switch ( typeof credentials ){
            case 'string': {
                credentialsObject = new Credentials(identifier, credentials);
            }break;
            case 'object': {
                if ( credentials !== null && credentials.hasOwnProperty('password') && typeof credentials.password === 'string' ){
                    // Generate the credentials object.
                    credentialsObject = new Credentials(identifier, credentials.password);
                    if ( credentials.hasOwnProperty('userData') ){
                        credentialsObject.setUserData(credentials.userData);
                    }
                    if ( credentials.hasOwnProperty('permissions') ){
                        if ( credentials.permissions instanceof Set ){
                            credentialsObject.setPermissions(credentials.permissions);
                        }else if ( Array.isArray(credentials.permissions) ){
                            credentialsObject.setPermissionsAsArray(credentials.permissions);
                        }
                    }
                }
            }break;
        }
        return credentialsObject;
    }

    /**
     * The class constructor.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     */
    constructor(){
        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'CredentialsProvider' ) {
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }
    }

    /**
     * Looks up user credentials based an a given user unique identifier, such as the username.
     *
     * @param {string} identifier A string representing the unique identifier of the user whose credentials will be looked up.
     *
     * @returns {Promise<?Credentials>} An instance of the class "Credentials" representing the credentials found null if no credential is found.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async lookup(identifier){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = CredentialsProvider;
