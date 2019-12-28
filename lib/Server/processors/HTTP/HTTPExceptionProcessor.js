'use strict';

// Including Lala's modules.
const ExceptionProcessor = require('../ExceptionProcessor');
const View = require('../../../View/View');
const {
    HTTPException,
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @typedef {Object} HTTPExceptionProcessorConfiguration An object containing all the properties supported by this class.
 *
 * @property {Map<string, exceptionHandler>} exceptionHandlers A map containing all the custom exception handler and having as key the exception constructor name and as value the callback function to execute.
 * @property {?exceptionHandler} defaultExceptionHandler A callback function to execute to handle an exception whenever no dedicated handler function has been defined for its constructor name.
 * @property {Map<string, View>} errorPages A map containing all the error pages to show up whenever a given exception occurs, each entry key must be a string containing the exception name and its value must be a "View" object.
 * @property {Map<number, View>} errorPagesByCode A map containing all the error pages to show up whenever a HTTP error occurs, each entry key must be a number representing the HTTP status code and its value must be a "View" object.
 * @property {?View} defaultErrorPage An instance of the class "View" representing the page to show when an exception occurs and no custom page has been defined for it nor its corresponding HTTP status code.
 */

/**
 * Handles uncaught exceptions thrown during request process.
 */
class HTTPExceptionProcessor extends ExceptionProcessor {
    /**
     * Injects exception related properties to the view that will be shown to the user in order to notify the error occurred.
     *
     * @param {(Error|HTTPException)} exception An instance of the native Error class or the built-in Exception class representing the exception occurred.
     * @param {View} view An instance of the class "View" representing the page to show up to the user.
     *
     * @protected
     */
    static _injectViewParameters(exception, view){
        // Extract generic information from this exception.
        let code = exception.hasOwnProperty('code') ? exception.code : 500;
        let message = exception.hasOwnProperty('message') && exception.message !== '' && typeof exception.message === 'string' ? exception.message : 'Internal Server Error.';
        if ( exception instanceof HTTPException ){
            // If the given exception is an HTTP specific one, then extract HTTP specific information.
            code = exception.constructor.getHTTPStatusCode();
            message = exception.constructor.getHTTPMessage();
        }
        // Injects all information found into the view.
        view.setData({
            message: message,
            code: code,
            exception: exception
        });
    }

    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {HTTPExceptionProcessorConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        const baseConfiguration = ExceptionProcessor.getDefaultConfiguration();
        const configuration = Object.create(baseConfiguration);
        configuration.errorPages = new Map();
        configuration.errorPagesByCode = new Map();
        configuration.defaultErrorPage = HTTPExceptionProcessor.DEFAULT_ERROR_VIEW;
        return configuration;
    }

    /**
     * Returns the error page defined based on given exception.
     *
     * @param {(Error|HTTPException)} exception An instance of the class "Error" or a derived class representing the exception.
     *
     * @returns {?View} An instance of the class "View" representing the page to show up, if no page has been defined, null will be returned instead.
     *
     * @protected
     */
    _getErrorPage(exception){
        let page = this._defaultErrorPage;
        if ( exception instanceof HTTPException ){
            // Get the HTTP status code according to this exception.
            const code = exception.constructor.getHTTPStatusCode();
            if ( this._errorPagesByCode.has(code) ){
                // Get the error page defined to handle this HTTP error code.
                page = this._errorPagesByCode.get(code);
            }
        }else if( this._errorPages.has(exception.constructor.name) ){
            // Get the error page defined to handle this exception type.
            page = this._errorPages.get(exception.constructor.name);
        }
        return page;
    }

    /**
     * Sets the HTTP status code and message for current client request based on given exception.
     *
     * @param {(Error|HTTPException)} exception An instance of the class "Error" or a derived class representing the exception to handle.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @protected
     */
    _setHTTPHeader(exception, response){
        if ( !response.headersSent ){
            response.statusCode = exception instanceof HTTPException ? exception.constructor.getHTTPStatusCode() : 500;
            response.statusMessage = exception instanceof HTTPException ? exception.constructor.getHTTPMessage() : 'Internal Server Error';
        }
    }

    /**
     * The class constructor.
     *
     * @param {?HTTPExceptionProcessorConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {Map<string, View>} _errorPages A map containing all the pages to show when the exception, which name is used as entry key, occurs.
         *
         * @protected
         */
        this._errorPages = new Map();

        /**
         * @type {Map<number, View>} _errorPagesByCode A map containing all the pages to show when a particular exception occurs, exception is defined by its corresponding HTTP status code.
         *
         * @protected
         */
        this._errorPagesByCode = new Map();

        /**
         * @type {?View} _defaultErrorPage An instance of the class "View" representing the page to show when an exception occurs and no custom page has been defined for it nor its corresponding HTTP status code.
         *
         * @protected
         */
        this._defaultErrorPage = HTTPExceptionProcessor.DEFAULT_ERROR_VIEW;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {HTTPExceptionProcessorConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {HTTPExceptionProcessor}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        super.configure(configuration);
        if ( configuration.hasOwnProperty('errorPages') && configuration.errorPages instanceof Map ){
            this._errorPages = configuration.errorPages;
        }
        if ( configuration.hasOwnProperty('errorPagesByCode') && configuration.errorPagesByCode instanceof Map ){
            this._errorPagesByCode = configuration.errorPagesByCode;
        }
        if ( configuration.hasOwnProperty('defaultErrorPage') && ( configuration.defaultErrorPage === null || typeof configuration.defaultErrorPage === 'function' ) ){
            this._defaultErrorPage = configuration.defaultErrorPage === null ? HTTPExceptionProcessor.DEFAULT_ERROR_VIEW : configuration.defaultErrorPage;
        }
        return this;
    }

    /**
     * Handles the given exception.
     *
     * @param {Error} exception An instance of the class "Error" or a derived class representing the exception to handle.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<*>} An error representation that can be sent to the client, usually a view.
     *
     * @async
     * @override
     */
    async process(exception, request, response){
        // Executes a custom handler function, if defined.
        let output = await super.process(exception, request, response);
        // Get the error page defined for this exception.
        const page = this._getErrorPage(exception);
        if ( page !== null ){
            //
            HTTPExceptionProcessor._injectViewParameters(exception, page);
            // If an error page is found or the default one is going to be used instead, then use that view as the return value.
            output = page;
        }
        if ( exception instanceof HTTPException ){
            // Sets the status code and message required by the HTTP protocol standard.
            response.statusCode = exception.constructor.getHTTPStatusCode();
            response.statusMessage = exception.constructor.getHTTPMessage();
        }
        // Set the HTTP status code and message to return to the client.
        this._setHTTPHeader(exception, response);
        return output;
    }
}

/**
 * @constant Defines the default error view to show up whenever an exception occurs during client request processing.
 *
 * @type {View}
 * @default
 */
Object.defineProperty(HTTPExceptionProcessor, 'DEFAULT_ERROR_VIEW', {
    value: new View(__dirname + '/../../resources/default_error_page.ejs'),
    writable: false,
    configurable: false
});

module.exports = HTTPExceptionProcessor;
