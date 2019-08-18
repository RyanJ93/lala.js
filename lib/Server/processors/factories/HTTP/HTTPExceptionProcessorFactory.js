'use strict';

// Including Lala's modules.
const ExceptionProcessorFactory = require('../ExceptionProcessorFactory');
const HTTPExceptionProcessor = require('../../HTTP/HTTPExceptionProcessor');
const View = require('../../../../View/View');
const {
    InvalidArgumentException
} = require('../../../../Exceptions');

/**
 * Allows the generation and configuration of instances of the class "HTTPExceptionProcessor" based on given configuration.
 */
class HTTPExceptionProcessorFactory extends ExceptionProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = HTTPExceptionProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the error page to show when a given exception occurs, this method is chainable.
     *
     * @param {string} exception A string containing the name of the exception associated to the given error page.
     * @param {?View} view An instance of the class "View" representing the error page to show, if null, no page will be shown for this exception.
     *
     * @return {HTTPExceptionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid exception name is given.
     * @throws {InvalidArgumentException} If an invalid view object is given.
     */
    setErrorPage(exception, view){
        if ( exception === '' || typeof exception !== 'string' ){
            throw new InvalidArgumentException('Invalid exception name.', 1);
        }
        if ( view !== null && !( view instanceof View ) ){
            throw new InvalidArgumentException('Invalid view.', 2);
        }
        if ( view === null ){
            this._properties.errorPages.delete(exception);
        }else{
            this._properties.errorPages.set(exception, view);
        }
        return this;
    }

    /**
     * Returns the error page defined for the given exception name.
     *
     * @param {string} exception A string containing the name of the exception associated to the given exception name.
     *
     * @returns {?View} An instance of the class "View" representing the page or null if no page has been defined for the given exception name.
     *
     * @throws {InvalidArgumentException} If an invalid exception name is given.
     */
    getErrorPage(exception){
        if ( exception === '' || typeof exception !== 'string' ){
            throw new InvalidArgumentException('Invalid exception name.', 1);
        }
        const view = this._properties.errorPages.get(exception);
        return typeof view === 'undefined' ? null : view;
    }

    /**
     * Sets an error page to show up whenever a given HTTP status code happens, this method is chainable.
     *
     * @param {number} code An integer number greater than zero representing the HTTP code to handle.
     * @param {?View} view An instance of the class "View" representing the error page to show, if null, no page will be shown for this code.
     *
     * @returns {HTTPExceptionProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid HTTP status code is given.
     * @throws {InvalidArgumentException} If an invalid view object is given.
     */
    setErrorPageByCode(code, view){
        if ( code === null || isNaN(code) || code <= 0 ){
            throw new InvalidArgumentException('Invalid HTTP status code.', 1);
        }
        if ( view !== null && !( view instanceof View ) ){
            throw new InvalidArgumentException('Invalid view.', 2);
        }
        if ( view === null ){
            this._properties.errorPagesByCode.delete(code);
        }else{
            this._properties.errorPagesByCode.set(code, view);
        }
        return this;
    }

    /**
     * Returns the error page defined for the given HTTP status code.
     *
     * @param {number} code An integer number greater than zero representing the HTTP code.
     *
     * @returns {?View} An instance of the class "View" representing the page or null if no page has been defined for the given HTTP status code.
     *
     * @throws {InvalidArgumentException} If an invalid HTTP status code is given.
     */
    getErrorPageByCode(code){
        if ( code === null || isNaN(code) || code <= 0 ){
            throw new InvalidArgumentException('Invalid HTTP status code.', 1);
        }
        const view = this._properties.errorPagesByCode.get(code);
        return typeof view === 'undefined' ? null : view;
    }

    /**
     * Sets the default error page to show up whenever an exception is thrown, this method is chainable.
     *
     * @param {?View} view An instance of the class "View" representing the page, if set to null, the default one will be used.
     *
     * @returns {HTTPExceptionProcessorFactory}
     */
    setDefaultErrorPage(view){
        if ( view !== null && !( view instanceof View ) ){
            throw new InvalidArgumentException('Invalid view.', 1);
        }
        this._properties.defaultErrorPage = view === null ? HTTPExceptionProcessor.DEFAULT_ERROR_VIEW : view;
        return this;
    }

    /**
     * Returns the default error page.
     *
     * @returns {View} An instance of the class "View" representing the page.
     */
    getDefaultStatusPage(){
        return this._properties.defaultErrorPage;
    }

    /**
     * Generates an instance of the class "HTTPExceptionProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {HTTPExceptionProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const exceptionProcessor = new HTTPExceptionProcessor();
        // Configuring class instance.
        exceptionProcessor.configure(this._properties);
        return exceptionProcessor;
    }
}

module.exports = HTTPExceptionProcessorFactory;
