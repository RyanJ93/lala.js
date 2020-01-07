'use strict';

// Including Lala's modules.
const PresentersRepository = require('../../View/PresentersRepository');
const AuthorizationProcessor = require('../processors/AuthorizationProcessor');

/**
 * Returns the CSRF token generated for current request.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 *
 * @returns {string} The plain CSRF token.
 */
function CSRFToken(parameters){
    let CSRFToken = '';
    if ( parameters._request !== null && typeof parameters._request === 'object' && parameters._request.CSRFToken !== null ){
        CSRFToken = parameters._request.CSRFToken.token;
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
 */
function CSRFField(parameters, name = null){
    if ( name === null ){
        name = AuthorizationProcessor.CSRF_DEFAULT_PARAM_NAME;
    }
    const CSRFToken = CSRFToken(parameters);
    return CSRFToken === '' ? '' : '<input type="hidden" name="' + name + '" value="' + CSRFToken + '" />';
}

/**
 * Returns a HTML meta containing the CSRF token generated for current request.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 * @param {?string} [name] A string containing the name that will be used for the HTML meta, if null, "csrf-token" will be used instead.
 *
 * @returns {string} A string containing the generate HTML code.
 */
function CSRFMeta(parameters, name = null){
    if ( name === null ){
        name = 'csrf-token';
    }
    const CSRFToken = CSRFToken(parameters);
    return CSRFToken === '' ? '' : '<meta name="' + name + '" content="' + CSRFToken + '" />';
}

module.exports.registerPresenters = () => {
    PresentersRepository.register('CSRFToken', CSRFToken);
    PresentersRepository.register('CSRFField', CSRFField);
    PresentersRepository.register('CSRFMeta', CSRFMeta);
};
