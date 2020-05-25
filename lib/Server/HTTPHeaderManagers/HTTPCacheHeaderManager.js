'use strict';

// Including Lala's modules.
const HeaderManager = require('./HeaderManager');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @typedef {Object} CachingParameters Contains the caching parameters to declare to the client for a specific resource.
 *
 * @property {number} maxAge An integer number greater or equal than zero representing the amount in seconds the resource should be cached for, if zero, this resource shouldn't be cached.
 * @property {boolean} [isPublic=true] If set to "false" the browser should save the cached resource in a protected environment.
 */

/**
 * Allows to manage the HTTP cache.
 */
class HTTPCacheHeaderManager extends HeaderManager {
    /**
     * Returns the correct caching parameters according to the response MIME type and the requested file's extension.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {?CachingParameters} An object containing the caching parameters found or null if none have been found.
     *
     * @protected
     */
    _getCachingParameters(request, response){
        // Look up caching parameters by response MIME type first.
        let parameters = this._MIMETypeBasedResources[response.MIMEType];
        if ( parameters === null || typeof parameters !== 'object' ){
            // No caching parameters found, Look up parameters by file extension instead.
            const index = request.path.lastIndexOf('.');
            // Extract file extension by request path.
            const extension = index === -1 ? null : request.path.substr(index + 1).toLowerCase();
            parameters = extension === null || extension === '' ? null : this._extensionBasedResources[extension];
        }
        return typeof parameters !== 'object' ? null : parameters;
    }

    /**
     * The class constructor.
     */
    constructor() {
        super();

        /**
         * @type {Object.<string, CachingParameters>} _MIMETypeBasedResources An object containing as key the resources MIME type and as value the caching parameters for those resources.
         *
         * @protected
         */
        this._MIMETypeBasedResources = Object.create(null);

        /**
         * @type {Object.<string, CachingParameters>} _MIMETypeBasedResources An object containing as key the resources file extension and as value the caching parameters for those resources.
         *
         * @protected
         */
        this._extensionBasedResources = Object.create(null);

        /**
         * @type {boolean} [_cacheEnabled=true] If set to "false" caching will be disabled for any MIME type or file extension defined.
         *
         * @protected
         */
        this._cacheEnabled = true;
    }

    /**
     * Sets how long resources having the given MIME type should be kept in cache, this method is chainable.
     * 
     * @param {string} MIMEType A string containing the MIME type that identifies the resource class.
     * @param {number} maxAge An integer number greater or equal than zero representing the amount of seconds the resources should be cached for, if zero no caching should be applied.
     * @param {boolean} [isPublic=true] If set to "false" the browser should save the cached resource in a protected environment.
     *
     * @return {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid MIME type is given.
     * @throws {InvalidArgumentException} If an invalid max age value is given.
     */
    setMIMETypeCaching(MIMEType, maxAge, isPublic = true){
        if ( MIMEType === '' || typeof MIMEType !== 'string' ){
            throw new InvalidArgumentException('Invalid MIME type.', 1);
        }
        if ( maxAge === null || isNaN(maxAge) || maxAge < 0 ){
            throw new InvalidArgumentException('Invalid max age value.', 2);
        }
        MIMEType = MIMEType.toLowerCase();
        this._MIMETypeBasedResources[MIMEType] = {
            maxAge: maxAge,
            isPublic: ( isPublic !== false )
        };
        return this;
    }

    /**
     * Sets how long resources having the given MIME types should be kept in cache, this method is chainable.
     *
     * @param {string[]} MIMETypes An array containing the MIME types that identify the resource classes.
     * @param {number} maxAge An integer number greater or equal than zero representing the amount of seconds the resources should be cached for, if zero no caching should be applied.
     * @param {boolean} [isPublic=true] If set to "false" the browser should save the cached resource in a protected environment.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid MIME types array is given.
     * @throws {InvalidArgumentException} If an invalid max age value is given.
     */
    setMultipleMIMETypeCaching(MIMETypes, maxAge, isPublic = true){
        if ( !Array.isArray(MIMETypes) ){
            throw new InvalidArgumentException('Invalid MIME types array.', 1);
        }
        if ( maxAge === null || isNaN(maxAge) || maxAge < 0 ){
            throw new InvalidArgumentException('Invalid max age value.', 2);
        }
        const length = MIMETypes.length;
        for ( let i = 0 ; i < length ; i++ ){
            this.setMIMETypeCaching(MIMETypes[i], maxAge, isPublic);
        }
        return this;
    }

    /**
     * Returns the caching parameters for a given MIME type.
     *
     * @param {string} MIMEType A string containing the MIME type that identifies the resource class.
     *
     * @returns {?CachingParameters} An object containing the caching parameters or null if no parameter has been defined for the given MIME type.
     *
     * @throws {InvalidArgumentException} If an invalid MIME type is given.
     */
    getMIMETypeCaching(MIMEType){
        if ( MIMEType === '' || typeof MIMEType !== 'string' ){
            throw new InvalidArgumentException('Invalid MIME type.', 1);
        }
        return typeof this._MIMETypeBasedResources[MIMEType] === 'object' ? this._MIMETypeBasedResources[MIMEType] : null;
    }

    /**
     * Removes the caching parameters defined for a given MIME type, this method is chainable.
     *
     * @param {string} MIMEType A string containing the MIME type.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid MIME type is given.
     */
    removeMIMETypeCaching(MIMEType){
        if ( MIMEType === '' || typeof MIMEType !== 'string' ){
            throw new InvalidArgumentException('Invalid MIME type.', 1);
        }
        MIMEType = MIMEType.toLowerCase();
        if ( typeof this._MIMETypeBasedResources[MIMEType] === 'object' ){
            delete this._MIMETypeBasedResources[MIMEType];
        }
        return this;
    }

    /**
     * Removes the caching parameters defined for multiple MIME types, this method is chainable.
     *
     * @param {string[]} MIMETypes An array of strings containing the MIME types.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    removeMultipleMIMETypeCaching(MIMETypes){
        if ( !Array.isArray(MIMETypes) ){
            throw new InvalidArgumentException('Invalid MIME types array.', 1);
        }
        const length = MIMETypes.length;
        for ( let i = 0 ; i < length ; i++ ){
            this.removeMIMETypeCaching(MIMETypes[i]);
        }
        return this;
    }

    /**
     * Sets up caching for a given file extension, this method is chainable.
     *
     * @param {string} extension A string containing the file extension.
     * @param {number} maxAge An integer number greater or equal than zero representing how long these assets should be cached for.
     * @param {boolean} [isPublic=true] If set to "false" browser will be told to store these assets in a private and secure way.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid file extension is given.
     * @throws {InvalidArgumentException} If an invalid max age value is given.
     */
    setExtensionCaching(extension, maxAge, isPublic = true){
        if ( extension === '' || typeof extension !== 'string' ){
            throw new InvalidArgumentException('Invalid extension.', 1);
        }
        if ( maxAge === null || isNaN(maxAge) || maxAge < 0 ){
            throw new InvalidArgumentException('Invalid max age value.', 2);
        }
        extension = extension.toLowerCase();
        this._extensionBasedResources[extension] = {
            maxAge: maxAge,
            isPublic: ( isPublic !== false )
        };
        return this;
    }

    /**
     * Sets up caching for multiple file extensions, this method is chainable.
     *
     * @param {string[]} extensions An array of strings containing the file extensions.
     * @param {number} maxAge An integer number greater or equal than zero representing how long these assets should be cached for.
     * @param {boolean} [isPublic=true] If set to "false" browser will be told to store these assets in a private and secure way.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid file extensions array is given.
     * @throws {InvalidArgumentException} If an invalid max age value is given.
     */
    setMultipleExtensionCaching(extensions, maxAge, isPublic = true){
        if ( !Array.isArray(extensions) ){
            throw new InvalidArgumentException('Invalid extensions array.', 1);
        }
        const length = extensions.length;
        for ( let i = 0 ; i < length ; i++ ){
            this.setExtensionCaching(extensions[i], maxAge, isPublic);
        }
        return this;
    }

    /**
     * Removes the caching parameters defined for a given file extension, this method is chainable.
     *
     * @param {string} extension A string containing the file extension.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid file extension is given.
     */
    removeExtensionCaching(extension){
        if ( extension === '' || typeof extension !== 'string' ){
            throw new InvalidArgumentException('Invalid extension.', 1);
        }
        extension = extension.toLowerCase();
        if ( typeof this._MIMETypeBasedResources[extension] === 'object' ){
            delete this._MIMETypeBasedResources[extension];
        }
        return this;
    }

    /**
     * Removes the caching parameters defined for multiple given file extensions, this method is chainable.
     *
     * @param {string[]} extensions An array of strings containing the file extensions.
     *
     * @returns {HTTPCacheHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid file extensions array is given.
     */
    removeMultipleExtensionCaching(extensions){
        if ( !Array.isArray(extensions) ){
            throw new InvalidArgumentException('Invalid extensions array.', 1);
        }
        const length = extensions.length;
        for ( let i = 0 ; i < length ; i++ ){
            this.removeExtensionCaching(extensions[i]);
        }
        return this;
    }

    /**
     * Sets if all the caching directives defined within this class instance should be applied or not, this method is chainable.
     *
     * @param {boolean} cacheEnabled If set to "false" caching directives wont be applied and then wont be sent to the client side.
     *
     * @returns {HTTPCacheHeaderManager}
     */
    setCacheEnabled(cacheEnabled){
        this._cacheEnabled = cacheEnabled === true;
        return this;
    }

    /**
     * Returns if caching directives defined should be applied or not.
     *
     * @returns {boolean}
     */
    getCacheEnabled(){
        return this._cacheEnabled === true;
    }

    /**
     * Generates the HTTP headers to include in the client response.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Object.<string, (string|string[])>} An object having as key the header name and as value one or multiple values (represented as an array).
     */
    buildHeaders(request, response){
        let headers = null;
        if ( request.headers['cache-control'] !== 'no-cache' && request.headers['pragma'] !== 'no-cache' ){
            // HTTP cache has not been disabled by the client side, processing cache control header.
            const cachingParameters = this._getCachingParameters(request, response);
            if ( this._cacheEnabled === false || ( cachingParameters !== null && cachingParameters.maxAge === 0 ) ){
                // Caching is disabled nor suitable caching parameters have been found but caching is disabled according to those parameters.
                headers = {};
                headers['Pragma'] = 'no-cache';
                headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
            }else if ( cachingParameters !== null ){
                // Caching is enabled and suitable caching parameters have been found.
                headers = {};
                headers['Cache-Control'] = cachingParameters.isPublic ? 'public' : 'private';
                headers['Cache-Control'] += ', max-age=' + cachingParameters.maxAge;
            }
        }
        return headers;
    }
}

module.exports = HTTPCacheHeaderManager;
