'use strict';

// Including Lala's modules.
const FirewallRule = require('./FirewallRule');
const CacheRepository = require('../../Cache/CacheRepository');
const Cache = require('../../Cache/Cache');
const Logger = require('../../Logger/Logger');
const { generateUUID } = require('../../Helpers/helpers/BuiltInHelpers');
const {
    InvalidArgumentException,
    TooManyRequestsHTTPException,
    RuntimeException
} = require('../../Exceptions');

/**
 * @typedef {Object} requestCounters An object containing all the properties related to the global and request's counters.
 *
 * @property {number} counter An integer number greater or equal than zero representing the amount of requests made by current client.
 * @property {number} URLCounter An integer number greater or equal than zero representing the number of request of a specific URL.
 * @property {number} lastRequestDate An integer number greater than zero representing the date when last request occurred, no matter its URL.
 * @property {number} URLLastRequestDateAn integer number greater than zero representing the date when last request to a specific URL occurred.
 */

/**
 * @typedef {Object} URLLimit An object representing limit settings for an URL.
 *
 * @property {number} limit An integer number greater than zero representing the number of requests that a client can made to a URL.
 * @property {?number} retryAfter The number of seconds after the client can retry request after being banned.
 */

/**
 * A firewall rule that allows limit requests count.
 */
class RequestCountRule extends FirewallRule {
    /**
     * Returns the cache handler object ot use to store request counters.
     *
     * @return {Cache} An instance of the class "Cache" representing the cache handler object to use.
     *
     * @throws {RuntimeException} If no cache handler has been found and then counters cannot be stored anywhere.
     *
     * @protected
     */
    _getCacheHandlerObject(){
        // Use the user defined cache handler as first choice.
        let handler = this._cacheHandler;
        if ( handler === null ){
            // If no cache handler has been defined for this class instance, then a globally defined one.
            handler = CacheRepository.get('@requestCountRule')
        }
        if ( handler === null ){
            // If none of those have been defined, use the default one.
            handler = CacheRepository.get('@default');
        }
        if ( handler === null ){
            throw new RuntimeException('No cache handler found.', 1);
        }
        return handler;
    }

    /**
     * Returns the namespace string to use for cache interactions.
     *
     * @returns {string} A string representing he namespace.
     *
     * @protected
     */
    _getNamespaceString(){
        let namespace = 'com.lala.firewall.requestCounter';
        if ( this._namespace !== null ){
            namespace += ':' + this._namespace;
        }
        return namespace;
    }

    /**
     * Returns all the properties associated to the client IP address.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @returns {Promise<requestCounters>} An object containing all the properties related to global counters and this URL's ones.
     *
     * @protected
     */
    async _getParameters(request){
        const identifier = request.connection.remoteAddress;
        // Get the cache instance used to store counters.
        const cacheHandler = this._getCacheHandlerObject();
        const globalKey = identifier + ':*';
        const key = identifier + ':' + request.url;
        // Get counter properties from the cache.
        const keys = [globalKey + ':c', key + ':c', globalKey + ':lrd', key + ':lrd'];
        const parameters = await cacheHandler.getMulti(keys, {
            silent: true,
            namespace: this._getNamespaceString()
        });
        // Ensure properties obtained from the cache to be numbers, yes, NaN is considered a number as well.
        parameters[globalKey + ':c'] = parameters[globalKey + ':c'] === null ? NaN : parseInt(parameters[globalKey + ':c']);
        parameters[key + ':c'] = parameters[key + ':c'] === null ? NaN : parseInt(parameters[key + ':c']);
        parameters[globalKey + ':lrd'] = parameters[globalKey + ':lrd'] === null ? NaN : parseInt(parameters[globalKey + ':lrd']);
        parameters[key + ':lrd'] = parameters[key + ':lrd'] === null ? NaN : parseInt(parameters[key + ':lrd']);
        return parameters;
    }

    /**
     * Performs request count checks on incoming connections.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @return {Promise<boolean>} Returns "true" if current client is allowed according to request limits defined, otherwise an exception will be thrown.
     *
     * @throws {TooManyRequestsHTTPException} If request limit defined has been trespassed and client request needs to be blocked.
     *
     * @async
     * @protected
     */
    async _filterIncomingConnection(request, response){
        const identifier = request.connection.remoteAddress;
        const parameters = await this._getParameters(request);
        const timestamp = Date.now();
        const URLSettings = this._URLLimit.get(request.url);
        let expire, lrd, limit, count, retryAfter, url = null;
        if ( typeof URLSettings === 'undefined' ){
            // No custom settings defined for current URL, using global settings and counters.
            expire = this._retryAfter === null ? NaN : ( timestamp - ( this._retryAfter * 1000 ) );
            lrd = parameters[identifier + ':*:lrd'];
            limit = this._limit;
            count = parameters[identifier + ':*:c'];
            retryAfter = this._retryAfter;
        }else{
            // Custom settings have been defined for this URL, using those ones and URL specific counters.
            expire = URLSettings.retryAfter === null ? NaN : ( timestamp - ( URLSettings.retryAfter * 1000 ) );
            lrd = parameters[identifier + ':' + request.url + ':lrd'];
            limit = URLSettings.limit;
            count = parameters[identifier + ':' + request.url + ':c'];
            retryAfter = URLSettings.retryAfter;
            url = request.url;
        }
        if ( !isNaN(expire) && expire > lrd ){
            // A previously issued ban has expired, counter will be reset.
            response.on('finish', () => {
                 this.resetClientCounter(identifier, url, true).catch((ex) => {
                     Logger.logError(ex);
                 });
            });
        }else{
            // As "count" value is the current one, without considering current request, it should be incremented before comparing or ">=" should be used as comparison operator rather than ">".
            if ( count >= limit ){
                // Request limit has been trespassed, request is going to blocked.
                if ( retryAfter !== null && !response.headerSent ){
                    response.setHeader('Retry-After', retryAfter);
                }
                throw new TooManyRequestsHTTPException('Request limit has been reached.', 1);
            }
            response.on('finish', () => {
                this.incrementClientCounter(identifier, url, 1, true).catch((ex) => {
                    Logger.logError(ex);
                });
            });
        }
        return true;
    }

    /**
     * Defines all the callback functions to execute for each checkpoint.
     *
     * @protected
     */
    _setupCheckpoints(){
        this._checkpoints.set('request.preprocess', (request, response) => {
            return this._filterIncomingConnection(request, response);
        });
    }

    /**
     * The class constructor.
     *
     * @param {?number} [limit=null] An integer number greater than zero representing the allowed maximum amount of requests for each client.
     */
    constructor(limit = null){
        super();

        /**
         * @type {?number} [_limit=null] An integer number representing the maximum amount of requests allowed for each client.
         *
         * @protected
         */
        this._limit = null;

        /**
         * @type {Map<string, URLLimit>} _URLLimit A map having as key the URL as a string and as value an object containing the limitation settings.
         *
         * @protected
         */
        this._URLLimit = new Map();

        /**
         * @type {?Cache} [_cacheHandler=null] An instance of the class "Cache" representing the cache handler used to store request counters.
         *
         * @protected
         */
        this._cacheHandler = null;

        /**
         * @type {?number} [_retryAfter=null] An integer number greater than zero that allows to inform clients after how many seconds requests can be retried.
         *
         * @protected
         */
        this._retryAfter = null;

        /**
         * @type {?string} [_namespace=null] A string containing an optional namespace used to isolate counters between multiple instances of this rule sharing the same cache handler.
         *
         * @protected
         */
        this._namespace = null;

        if ( limit !== null && limit > 0 && !isNaN(limit) ){
            this.setLimit(limit);
        }
        // Setup the callback functions to handle required checkpoints.
        this._setupCheckpoints();
    }

    /**
     * Sets the global request limit allowed for each client, this method is chainable.
     *
     * @param {?number} limit An integer number greater or equal than zero representing the request limit, if set to null, no limit will be applied.
     *
     * @return {RequestCountRule}
     *
     * @throws {InvalidArgumentException} If an invalid limit is given.
     */
    setLimit(limit){
        if ( limit !== null && ( isNaN(limit) || limit < 0 ) ){
            throw new InvalidArgumentException('Invalid limit value.', 1);
        }
        this._limit = limit;
        return this;
    }

    /**
     * Returns the global request limit defined.
     *
     * @returns {?number} An integer number greater or equal than zero representing the request limit or null if no limit has been defined.
     */
    getLimit(){
        return this._limit;
    }

    /**
     * Sets the amount of seconds after requests will be accepted again after a client got banned, this method is chainable.
     *
     * @param {?number} seconds An integer number greater than zero representing the ban period in seconds or null if clients should be banned for an undetermined period of time.
     *
     * @return {RequestCountRule}
     *
     * @throws {InvalidArgumentException} If an invalid time amount si given.
     */
    setRetryAfter(seconds){
        if ( seconds !== null && ( isNaN(seconds) || seconds < 0 ) ){
            throw new InvalidArgumentException('Invalid limit value.', 1);
        }
        this._retryAfter = seconds === 0 ? null : seconds;
        return this;
    }

    /**
     * Returns the amount of time requests will be accepted again after a client got banned.
     *
     * @return {?number} An integer number representing that time in seconds or null if clients are meant to be banned indeterminately.
     */
    getRetryAfter(){
        return this._retryAfter;
    }

    /**
     * Sets the request limit for a given URL, this method is chainable.
     *
     * @param {string} url A string representing the URL.
     * @param {?number} limit An integer number greater or equal than zero representing the request limit, if set to null, no limit will be applied to the given URL.
     * @param {?number} [retryAfter=null] An integer number greater than zero representing the amount of seconds after a banned client will be unbanned and allowed to issue new requests.
     *
     * @return {RequestCountRule}
     *
     * @throws {InvalidArgumentException} If an invalid URL is given.
     * @throws {InvalidArgumentException} If an invalid limit value is given.
     */
    setURLLimit(url, limit, retryAfter = null){
        if ( url === '' || typeof url !== 'string' ){
            throw new InvalidArgumentException('Invalid URL.', 1);
        }
        if ( limit !== null && ( isNaN(limit) || limit < 0 ) ){
            throw new InvalidArgumentException('Invalid limit value.', 2);
        }
        if ( retryAfter !== null && ( isNaN(retryAfter) || retryAfter < 0 ) ){
            throw new InvalidArgumentException('Invalid limit value.', 1);
        }
        if ( limit !== null ){
            this._URLLimit.set(url, {
                limit: limit,
                retryAfter: retryAfter
            });
            return this;
        }
        this._URLLimit.delete(url);
        return this;
    }

    /**
     * Returns the request limit defined for a given URL.
     *
     * @param {string} url A string representing the URL.
     *
     * @returns {?number} An integer number greater or equal than zero representing the request limit or null if no limit has been defined for this URL.
     *
     * @throws {InvalidArgumentException} If an invalid URL is given.
     */
    getURLLimit(url){
        if ( url === '' || typeof url !== 'string' ){
            throw new InvalidArgumentException('Invalid URL.', 1);
        }
        const limit = this._URLLimit.get(url);
        return typeof limit !== 'undefined' ? limit.limit : null;
    }

    /**
     * Returns the amount of time that the requests to the given URL will be accepted again after a client got banned.
     *
     * @param {string} url A string representing the URL.
     *
     * @returns {?number} An integer number greater than zero representing the amount of time defined time or null if clients are meant to be banned indeterminately.
     *
     * @throws {InvalidArgumentException} If an invalid URL is given.
     */
    getURLRetryAfter(url){
        if ( url === '' || typeof url !== 'string' ){
            throw new InvalidArgumentException('Invalid URL.', 1);
        }
        const limit = this._URLLimit.get(url);
        return typeof limit !== 'undefined' ? limit.retryAfter : null;
    }

    /**
     * Sets the cache object used to store request counters, this method is chainable.
     *
     * @param {?Cache} cacheHandler An instance of the class "Cache" representing the cache handler to use.
     *
     * @return {RequestCountRule}
     *
     * @throws {InvalidArgumentException} If an invalid cache handler class is given.
     */
    setCacheHandler(cacheHandler){
        if ( cacheHandler !== null && !( cacheHandler instanceof Cache ) ){
            throw new InvalidArgumentException('Invalid cache handler.', 1);
        }
        this._cacheHandler = cacheHandler;
        return this;
    }

    /**
     * Returns the cache object being used to store request counters.
     *
     * @return {?Cache} An instance of the class "Cache" representing the cache handler in use or null if no cache handler has been found.
     */
    getCacheHandler(){
        return this._cacheHandler;
    }

    /**
     * Sets the namespace to use in order to separate counters used by this rule instance within the cache handler being used, this method is chainable.
     *
     * @param {?string} namespace A string containing the namespace to use, if set to null no namespace will be used, changing namespace will lead to counters reset.
     *
     * @returns {RequestCountRule}
     *
     * @throws {InvalidArgumentException} If an invalid namespace is given.
     */
    setNamespace(namespace){
        if ( namespace !== null && typeof namespace !== 'string' ){
            throw new InvalidArgumentException('Invalid namespace.', 1);
        }
        this._namespace = namespace === '' ? null : namespace;
        return this;
    }

    /**
     * Returns the namespace being used in order to separate counters used by this rule instance within the cache handler.
     *
     * @returns {?string} A string containing the namespace or null if no namespace has been defined.
     */
    getNamespace(){
        return this._namespace;
    }

    /**
     * Generates and sets a random namespace used in order to separate counters used by this rule instance within the cache handler.
     *
     * @returns {string} A string representing the generated namespace.
     */
    useRandomNamespace(){
        this._namespace = generateUUID(4, false);
        return this._namespace;
    }

    /**
     * Increments the request counter for a client based on a given identifier.
     *
     * @param {string} identifier A string representing the client identifier, usually an IP address.
     * @param {?string} [url=null] A string containing the URL whose counter will be incremented, if set to null the global counter will be incremented instead.
     * @param {number} [amount=1] An integer number representing the amount to add to current counter value.
     * @param {boolean} [logDate=true] If set to "true", last request date will be updated to current date.
     *
     * @return {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     * @throws {InvalidArgumentException} If an invalid increment amount is given.
     *
     * @async
     */
    async incrementClientCounter(identifier, url = null, amount = 1, logDate = true){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        if ( amount === null || isNaN(amount) || amount === 0 ){
            throw new InvalidArgumentException('Invalid increment amount.', 2);
        }
        const cacheHandler = this._getCacheHandlerObject();
        // Generate the base key according to URL defined, if no URL is given, generate the global key for this client.
        const key = url !== null && url !== '' && typeof url === 'string' ? ( identifier + ':' + url ) : ( identifier + ':*' );
        const processes = [], namespace = this._getNamespaceString();
        // Increment the request counter for this client.
        processes[0] = cacheHandler.increment(key + ':c', amount, {
            create: true,
            namespace: namespace
        });
        if ( logDate === true ){
            // Update client's last request date to current date.
            processes[1] = cacheHandler.set(key + ':lrd', Date.now(), {
                overwrite: true,
                namespace: namespace
            });
        }
        await Promise.all(processes);
    }

    /**
     * Resets the request counter for a client based on a given identifier.
     *
     * @param {string} identifier A string representing the client identifier, usually an IP address.
     * @param {?string} [url=null] A string containing the URL whose counter will be reset, if set to null the global counter will be reset instead.
     * @param {boolean} [initialize=false] If set to "true" counter will be reset to 1, otherwise to 0.
     *
     * @return {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid identifier is given.
     * @throws {RuntimeException} If no cache handler has been defined and then counters cannot be stored.
     *
     * @async
     */
    async resetClientCounter(identifier, url = null, initialize = false){
        if ( identifier === '' || typeof identifier !== 'string' ){
            throw new InvalidArgumentException('Invalid identifier.', 1);
        }
        const cacheHandler = this._getCacheHandlerObject();
        // Generate the base key according to URL defined, if no URL is given, generate the global key for this client.
        const key = url !== null && url !== '' && typeof url === 'string' ? ( identifier + ':' + url ) : ( identifier + ':*' );
        const entries = {};
        entries[key + ':c'] = initialize === true ? 1 : 0;
        entries[key + ':lrd'] = Date.now();
        await cacheHandler.setMulti(entries, {
            overwrite: true,
            namespace: this._getNamespaceString()
        });
    }

    /**
     * Drops all the counters, both globals and URL related ones.
     *
     * @returns {Promise<void>}
     *
     * @async
     */
    async resetAllCounters(){
        const cacheHandler = this._getCacheHandlerObject();
        // Removes all the counters and related data.
        await cacheHandler.invalidate({
            namespace: this._getNamespaceString()
        });
    }
}

module.exports = RequestCountRule;
