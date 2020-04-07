'use strict';

// Including Lala's modules.
const HelperRepository = require('../../Helpers/HelperRepository');

/**
 * @typedef {Object} AuthorizationProcessorHelperContext An object containing the context variables required by helper functions.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 */

/**
 * Returns the CSRF token assigned to current client request.
 *
 * @param {AuthorizationProcessorHelperContext} context An object containing all the variables needed by this function to work within the invoking context.
 *
 * @returns {?CSRFToken} An object representing the generated CSRF token.
 */
function getCSRFToken(context){
    let CSRFTokenObject = context.request._CSRFToken;
    if ( typeof CSRFTokenObject !== 'object' ){
        CSRFTokenObject = this.attachCSRFToken(context.request, context.response);
    }
    return CSRFTokenObject;
}

module.exports.registerHelpers = () => {
    HelperRepository.register('getCSRFToken', getCSRFToken, 'com.lala.server.processor.AuthorizationProcessor.request');
};
