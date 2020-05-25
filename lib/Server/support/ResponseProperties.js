'use strict';

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * @typedef {Object} ContentRangeComponents An object containing the range values of the slice of data returned.
 *
 * @property {number} start An integer number greater or equal than zero representing the start point in bytes.
 * @property {number} end An integer number greater than zero representing the end of the data range in bytes.
 * @property {number} size An integer number greater than zero representing the full length in bytes of the resource being served.
 * @property {number} length An integer number greater than zero representing the length of the range in bytes.
 */

/**
 * This class contains some properties to declare to the client as a set of HTTP headers whenever a resource is requested.
 */
class ResponseProperties {
    /**
     * The class constructor.
     */
    constructor() {
        /**
         * @type {?string} [_MIMEType] A string containing the MIME type to declare to the client.
         *
         * @protected
         */
        this._MIMEType = null;

        /**
         * @type {?string} [_charset] A string containing the charset that should be declared to the client alongside the content type.
         *
         * @protected
         */
        this._charset = null;

        /**
         * @type {number} [_contentLength=0] An integer number greater or equal than zero representing the response size in bytes, if zero no length will be declared.
         *
         * @protected
         */
        this._contentLength = 0;

        /**
         * @type {boolean} [_rangedRequestSupported=false] If set to "true" it means that ranged requests are supported for the returned resource.
         *
         * @protected
         */
        this._rangedRequestSupported = false;

        /**
         * @type {ContentRangeComponents[]} [_contentRanges] An array containing the slices of the file being served, if empty the full file is going to be sent.
         *
         * @protected
         */
        this._contentRanges = [];

        /**
         * @type {?Date} [_lastModifiedDate] An instance of the class "Date" representing the date when the returned file has been modified for the last time.
         *
         * @protected
         */
        this._lastModifiedDate = null;

        /**
         * @type {?string} [_eTag] A string containing an arbitrary identifier used to detect file changes for caching purposes.
         *
         * @protected
         */
        this._eTag = null;

        /**
         * @type {boolean} [_unchanged=false] If set to "true" it means that the processed resource didn't change according to the tracking information provided by the client side.
         *
         * @protected
         */
        this._unchanged = false;
    }

    /**
     * Sets the MIME type that should be declared to the client as the response content type, this method is chainable.
     *
     * @param {?string} MIMEType A string containing the MIME type or null if none should be declared.
     *
     * @return {ResponseProperties}
     *
     * @throws {InvalidArgumentException} If an invalid MIME type is given.
     */
    setMIMEType(MIMEType){
        if ( MIMEType !== null && ( MIMEType === '' || typeof MIMEType !== 'string' ) ){
            throw new InvalidArgumentException('Invalid MIME type.', 1);
        }
        this._MIMEType = MIMEType === '' ? null : MIMEType;
        return this;
    }

    /**
     * Returns the MIME type that should be declared to the client according to this response's returned data.
     *
     * @returns {?string} A string representing the MIME type or null if no suitable MIME type has been found.
     */
    getMIMEType(){
        return this._MIMEType;
    }

    /**
     * Sets the charset to declare to the client, this method is chainable.
     *
     * @param {string} charset A string containing the charset or null if no charset should be declared.
     *
     * @return {ResponseProperties}
     *
     * @throws {InvalidArgumentException} If an invalid charset is given.
     */
    setCharset(charset){
        if ( charset !== null && ( charset === '' || typeof charset !== 'string' ) ){
            throw new InvalidArgumentException('Invalid charset.', 1);
        }
        this._charset = charset === '' ? null : charset;
        return this;
    }

    /**
     * Returns the charset that should be declared to the client alongside the content type.
     *
     * @returns {?string} A string representing the charset or null if no suitable charset has been found.
     */
    getCharset(){
        return this._charset;
    }

    /**
     * Sets the length of the response, in bytes, that should be declared to the client.
     *
     * @param contentLength An integer number greater or equal than zero representing the length value, if zero no length will be declared.
     *
     * @return {ResponseProperties}
     *
     * @throws {InvalidArgumentException} If an invalid length is given.
     */
    setContentLength(contentLength){
        if ( isNaN(contentLength) || contentLength < 0 ){
            throw new InvalidArgumentException('Invalid content length.', 1);
        }
        this._contentLength = contentLength;
        return this;
    }

    /**
     * Returns the response size in bytes.
     *
     * @returns {number} An integer number greater or equal than zero representing the response size in bytes, if zero no length should be declared.
     */
    getContentLength(){
        return this._contentLength;
    }

    /**
     * Sets if ranged request is supported for current resource, this method is chainable.
     *
     * @param {boolean} rangedRequestSupported If set to "true" the client will be informed that ranged requests are supported for current resource.
     *
     * @return {ResponseProperties}
     */
    setRangedRequestSupported(rangedRequestSupported){
        this._rangedRequestSupported = rangedRequestSupported === true;
        return this;
    }

    /**
     * Returns if ranged requests are supported for this resource.
     *
     * @returns {boolean} If ranged request are supported will be returned "true".
     */
    getRangedRequestSupported(){
        return this._rangedRequestSupported;
    }

    /**
     * Sets the file's slices being served as of the range request scenario, this method is chainable.
     *
     * @param {ContentRangeComponents[]} contentRanges An array of objects where each object represents the file's slice being served.
     *
     * @return {ResponseProperties}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    setContentRanges(contentRanges){
        if ( !Array.isArray(contentRanges) ){
            throw new InvalidArgumentException('Invalid content ranges.', 1);
        }
        this._contentRanges = contentRanges;
        return this;
    }

    /**
     * Returns the file's slices being served as of the range request scenario.
     *
     * @return {?ContentRangeComponents[]} An array of objects where each object represents the file's'slice being served.
     */
    getContentRanges(){
        return this._contentRanges;
    }

    /**
     * Sets the last modified data for the requested file used for caching purposes, this method is chainable.
     *
     * @param {?Date} lastModifiedDate An instance of the class "Date" or null if no last modified date should be declared.
     *
     * @return {ResponseProperties}
     *
     * @throws {InvalidArgumentException} If an invalid date is given.
     */
    setLastModifiedDate(lastModifiedDate){
        if ( lastModifiedDate !== null && !( lastModifiedDate instanceof Date ) ){
            throw new InvalidArgumentException('Invalid last modified date.', 1);
        }
        this._lastModifiedDate = lastModifiedDate;
        return this;
    }

    /**
     * Return the last modified data for the requested file.
     *
     * @return {?Date} An instance of the class "Date" or null if no last modified date has been defined.
     */
    getLastModifiedDate(){
        return this._lastModifiedDate;
    }

    /**
     * Sets a version identifier for current file used for caching purposes, this method is chainable.
     *
     * @param {?string} eTag A string representing the version identifier to declare or null if no etag should be declared to the client.
     *
     * @return {ResponseProperties}
     *
     * @throws {InvalidArgumentException} If an invalid etag is given.
     */
    setETag(eTag){
        if ( eTag !== null && typeof eTag !== 'string' ){
            throw new InvalidArgumentException('Invalid etag.', 1);
        }
        this._eTag = eTag;
        return this;
    }

    /**
     * Returns current file version identifier that has been defined.
     *
     * @return {?string} A string representing the version identifier or null if none has been declared.
     */
    getETag(){
        return this._eTag;
    }

    /**
     * Sets if the requested resource has not changed according to the tracking information provided by the client side, this method is chainable.
     *
     * @param {boolean} unchanged If set to "true" it means that the resource has changed and it shouldn't be send back to the client.
     *
     * @returns {ResponseProperties}
     */
    setUnchanged(unchanged){
        this._unchanged = unchanged === true;
        return this;
    }

    /**
     * Returns if the requested resource has not changed according to the tracking information provided by the client side.
     *
     * @returns {boolean} If the resource has not changed will be returned "true", by default "false" is returned.
     */
    getUnchanged(){
        return this._unchanged === true;
    }
}

module.exports = ResponseProperties;
