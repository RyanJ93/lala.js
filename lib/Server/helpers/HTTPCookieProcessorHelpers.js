'use strict';

// Including Lala's modules.
const HelperRepository = require('../../Helpers/HelperRepository');

/**
 * @typedef {Object} HTTPCookieProcessorHelpersContext An object containing the context variables required by helper functions.
 *
 * @property {HTTPCookieProcessor} processor The reference to the processor instance where the helper has been injected from.
 */

/**
 * Sets a cookie on the client side.
 *
 * @param {HTTPCookieProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} name A string containing the cookie unique name.
 * @param {string} value A string containing some data to store in the cookie.
 * @param {?CookieOptions} [options] An object containing some additional attributes this cookie should take care of.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 * @throws {InvalidArgumentException} If a non-string value is given as cookie value.
 */
function setCookie(context, name, value, options = null){
    context.processor.setCookie(name, value, options);
}

/**
 * Removes a given cookie.
 *
 * @param {HTTPCookieProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} name A string containing the cookie unique name.
 * @param {?CookieOptions} [options] An object containing some additional attributes this cookie should take care of, note that expiration day is ignored here.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 */
function removeCookie(context, name, options = null){
    context.processor.removeCookie(name, options);
}

/**
 * Returns a cookie matching the given name.
 *
 * @param {HTTPCookieProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} name A string containing the name of the cookie to return.
 *
 * @returns {?Cookie} An instance of the class "Cookie" representing the cookie found or null if no cookie matching this name is found.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 */
function getCookie(context, name){
    return context.processor.getCookie(name);
}

/**
 * Returns the value of a cookie matching the given name.
 *
 * @param {HTTPCookieProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} name A string containing the name of the cookie to return.
 *
 * @returns {?string} A string containing the cookie value or null if no cookie matching this name has been found.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 */
function getCookieValue(context, name){
    return context.processor.getCookieValue(name);
}

module.exports.registerHelpers = () => {
    HelperRepository.register('setCookie', setCookie, 'com.lala.server.processor.HTTPCookieProcessor.response');
    HelperRepository.register('removeCookie', removeCookie, 'com.lala.server.processor.HTTPCookieProcessor.response');
    HelperRepository.register('getCookie', getCookie, 'com.lala.server.processor.HTTPCookieProcessor.request');
    HelperRepository.register('getCookieValue', getCookieValue, 'com.lala.server.processor.HTTPCookieProcessor.request');
};
