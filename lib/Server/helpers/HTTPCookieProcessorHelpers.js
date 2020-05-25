'use strict';

// Including Lala's modules.
const HelperRepository = require('../../Helpers/HelperRepository');

/**
 * Sets a cookie on the client side.
 *
 * @param {string} name A string containing the cookie unique name.
 * @param {string} value A string containing some data to store in the cookie.
 * @param {?CookieOptions} [options] An object containing some additional attributes this cookie should take care of.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 * @throws {InvalidArgumentException} If a non-string value is given as cookie value.
 */
function setCookie(name, value, options = null){
    this.setCookie(name, value, options);
}

/**
 * Removes a given cookie.
 *
 * @param {string} name A string containing the cookie unique name.
 * @param {?CookieOptions} [options] An object containing some additional attributes this cookie should take care of, note that expiration day is ignored here.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 */
function removeCookie(name, options = null){
    this.removeCookie(name, options);
}

/**
 * Returns a cookie matching the given name.
 *
 * @param {string} name A string containing the name of the cookie to return.
 *
 * @returns {?Cookie} An instance of the class "Cookie" representing the cookie found or null if no cookie matching this name is found.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 */
function getCookie(name){
    return this.getCookie(name);
}

/**
 * Returns the value of a cookie matching the given name.
 *
 * @param {string} name A string containing the name of the cookie to return.
 *
 * @returns {?string} A string containing the cookie value or null if no cookie matching this name has been found.
 *
 * @throws {InvalidArgumentException} If an invalid cookie name is given.
 */
function getCookieValue(name){
    return this.getCookieValue(name);
}

module.exports.registerHelpers = () => {
    HelperRepository.register('setCookie', setCookie, 'com.lala.server.processor.HTTPCookieProcessor.response');
    HelperRepository.register('removeCookie', removeCookie, 'com.lala.server.processor.HTTPCookieProcessor.response');
    HelperRepository.register('getCookie', getCookie, 'com.lala.server.processor.HTTPCookieProcessor.request');
    HelperRepository.register('getCookieValue', getCookieValue, 'com.lala.server.processor.HTTPCookieProcessor.request');
};
