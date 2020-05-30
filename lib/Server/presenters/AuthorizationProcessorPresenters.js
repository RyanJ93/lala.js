'use strict';

// Including Lala's modules.
const PresentersRepository = require('../../View/PresentersRepository');
const AuthorizationProcessor = require('../processors/AuthorizationProcessor');
const RoutedServer = require('../../Server/RoutedServer');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Returns the CSRF token generated for current request.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 *
 * @returns {string} The plain CSRF token.
 */
function CSRFToken(parameters){
    let CSRFToken = '';
    if ( parameters._request !== null && typeof parameters._request === 'object' ){
        if ( parameters._request.CSRFToken !== null && typeof parameters._request.CSRFToken === 'object' ){
            CSRFToken = parameters._request.CSRFToken.token;
        }
    }
    return CSRFToken;
}

/**
 * Returns a HTML hidden input field containing the CSRF token generated for current request.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 * @param {?string} [name] A string containing the name that will be used for the HTML input, if null, "_csrf" will be used instead.
 *
 * @returns {string} A string containing the generate HTML code.
 *
 * @throws {InvalidArgumentException} If an invalid name is given for the HTML input field.
 */
function CSRFField(parameters, name = null){
    if ( name === null ){
        if ( parameters._request !== null && typeof parameters._request === 'object' && parameters._request.server instanceof RoutedServer ){
            name = parameters._request.server.getAuthorizationProcessorFactory().getCSRFFieldName();
        }else{
            name = AuthorizationProcessor.CSRF_DEFAULT_PARAM_NAME;
        }
    }else if ( name === '' || typeof name !== 'string' ){
        throw new InvalidArgumentException('Invalid HTML input name.', 1);
    }
    const CSRFToken = this.CSRFToken(parameters);
    return CSRFToken === '' ? '' : '<input type="hidden" name="' + name + '" value="' + CSRFToken + '" />';
}

/**
 * Returns a HTML meta containing the CSRF token generated for current request.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 * @param {?string} [name] A string containing the name that will be used for the HTML meta, if null, "csrf-token" will be used instead.
 *
 * @returns {string} A string containing the generate HTML code.
 *
 * @throws {InvalidArgumentException} If an invalid name is given for the HTML meta tag.
 */
function CSRFMeta(parameters, name = null){
    if ( name === null ){
        name = 'csrf-token';
    }else if ( name === '' || typeof name !== 'string' ){
        throw new InvalidArgumentException('Invalid HTML meta name.', 1);
    }
    const CSRFToken = this.CSRFToken(parameters);
    return CSRFToken === '' ? '' : '<meta name="' + name + '" content="' + CSRFToken + '" />';
}

module.exports.registerPresenters = () => {
    PresentersRepository.register('CSRFToken', CSRFToken);
    PresentersRepository.register('CSRFField', CSRFField);
    PresentersRepository.register('CSRFMeta', CSRFMeta);
};
