'use strict';

// Including native modules.
const dns = require('dns');

// Including Lala's modules.
const {
    RuntimeException,
    InvalidArgumentException
} = require('../Exceptions');

/**
 *
 */
class DNSUtils {
    /**
     * Resolves a given domain by querying the DNS and returns any DNS record found.
     *
     * @param {string} domain A string containing the domain name to look up.
     * @param {number} timeout An integer number greater than zero representing the DNS query timeout in seconds or null if no timeout should be applied.
     *
     * @returns {Promise<module:dns.AnyRecord[]>} An array containing the DNS records as object, if no result has been returned from the DNS and empty array will be returned.
     *
     * @throws {RuntimeException} If an error occurs during the DNS query.
     * @throws {RuntimeException} If the DNS query timeout.
     *
     * @async
     * @protected
     */
    static _resolveAnyDNS(domain, timeout){
        return new Promise((resolve, reject) => {
            let timeoutID = null;
            if ( timeout !== null ){
                timeoutID = setTimeout(() => {
                    return reject(new RuntimeException('DNS request timed out.', 2));
                }, timeout * 1000);
            }
            dns.resolveAny(domain, (error, results) => {
                if ( timeoutID !== null ){
                    clearTimeout(timeoutID);
                }
                if ( error !== null ){
                    if ( error.code === 'ENOTFOUND' ){
                        return resolve([]);
                    }
                    return reject(new RuntimeException('An error occurred while resolving the given domain.', 1, error));
                }
                resolve(results);
            });
        });
    }

    /**
     * Resolves a given domain by querying the DNS and returns all the records matching the given type.
     *
     * @param {string} domain A string containing the domain name to look up.
     * @param {string} rrtype A string containing the DNS record type to look up and return.
     * @param {number} timeout An integer number greater than zero representing the DNS query timeout in seconds or null if no timeout should be applied.
     *
     * @returns {Promise<module:dns.AnyRecord[]>} An array containing the DNS records as object, if no result has been returned from the DNS and empty array will be returned.
     *
     * @throws {RuntimeException} If an error occurs during the DNS query.
     * @throws {RuntimeException} If the DNS query timeout.
     *
     * @async
     * @protected
     */
    static _resolveDNS(domain, rrtype, timeout){
        return new Promise((resolve, reject) => {
            let timeoutID = null;
            if ( timeout !== null ){
                timeoutID = setTimeout(() => {
                    return reject(new RuntimeException('DNS request timed out.', 2));
                }, timeout * 1000);
            }
            dns.resolve(domain, rrtype, (error, results) => {
                if ( timeoutID !== null ){
                    clearTimeout(timeoutID);
                }
                if ( error !== null ){
                    if ( error.code === 'ENOTFOUND' ){
                        return resolve([]);
                    }
                    return reject(new RuntimeException('An error occurred while resolving the given domain.', 1, error));
                }
                rrtype = rrtype.toUpperCase();
                const records = [], length = results.length;
                for ( let i = 0 ; i < length ; i++ ){
                    records.push({
                        value: results[i],
                        type: rrtype
                    });
                }
                resolve(records);
            });
        });
    }

    static _buildDNSResultObject(rrtype, result){
        let resultObj;
        switch ( rrtype ){
            case 'A':
            case 'AAAA': {
                resultObj = {
                    value: result,
                    type: rrtype
                };
            }break;
            //case ''
        }
    }

    /**
     * Resolves a given domain by querying the DNS and returns all the records matching the given type.
     *
     * @param {string} domain A string containing the domain name to look up.
     * @param {?(string|string[])} [rrtype] A string containing the DNS record type to look up and return, multiple types can be selected using an array of string, if null all types will be returned.
     * @param {?number} [timeout] An integer number greater than zero representing the DNS query timeout in seconds or null if no timeout should be applied.
     *
     * @returns {Promise<module:dns.AnyRecord[]>} An array containing the DNS records as object, if no result has been returned from the DNS and empty array will be returned.
     *
     * @throws {InvalidArgumentException} If an invalid domain name is given.
     * @throws {RuntimeException} If an error occurs during the DNS query.
     * @throws {RuntimeException} If the DNS query timeout.
     *
     * @async
     */
   static async resolve(domain, rrtype = null, timeout = null){
        if ( domain === '' || typeof domain !== 'string' ){
            throw new new InvalidArgumentException('Invalid domain name.', 1);
        }
        if ( rrtype === null || ( rrtype !== '' && typeof rrtype === 'string' ) ){
            rrtype = [rrtype];
        }else if ( !Array.isArray(rrtype) || rrtype.length === 0 ){
            throw new new InvalidArgumentException('Invalid record type.', 2);
        }
        if ( timeout !== null && ( isNaN(timeout) || timeout <= 0 ) ){
            throw new new InvalidArgumentException('Invalid timeout value.', 3);
        }
        const processes = [], length = rrtype.length;
        for ( let i = 0 ; i < length ; i++ ){
            processes.push(rrtype[i] === null ? DNSUtils._resolveAnyDNS(domain, timeout) : DNSUtils._resolveDNS(domain, rrtype[i], timeout));
        }
        const results = await Promise.all(processes);
        return [].concat(...results);
   }
}

module.exports = DNSUtils;
