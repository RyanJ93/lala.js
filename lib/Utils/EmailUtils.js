'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Contains some utilities that can be useful whenever dealing with email addresses.
 */
class EmailUtils {
    /**
     * Validates a given email address.
     *
     * @param {string} emailAddress A string containing the email address to validate.
     *
     * @returns {boolean} If the given email address is well formed then will be returned "true".
     *
     * @throws {InvalidArgumentException} If an invalid email address is given.
     *
     * @see https://emailregex.com
     */
    static validate(emailAddress){
        if ( typeof emailAddress !== 'string' ){
            throw new InvalidArgumentException('Invalid email address.', 1);
        }
        let valid = false;
        if ( emailAddress !== '' && emailAddress.indexOf('@') > 0 ){
            valid = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(emailAddress);
        }
        return valid;
    }
}

module.exports = EmailUtils;
