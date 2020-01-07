'use strict';

// Including Lala's modules.
const BaseView = require('./BaseView');
const PresentersRepository = require('./PresentersRepository');
const constants = require('../constants');
const {
    InvalidArgumentException,
    RuntimeException,
    NotCallableException
} = require('../Exceptions');

/**
 * @typedef {Object} MergedViewParameters An object containing all the parameters to pass to the view during rendering.
 *
 * @property {Object.<string, *>} cacheFactors An object containing those parameters that should be used to generate an unique caching key for this view.
 * @property {Object.<string, *>} all All the parameters including framework's constants and presenter functions.
 */

/**
 * Allows to create view object having templates that support parameters.
 *
 * @abstract
 */
class ParametrizedView extends BaseView {
    /**
     * Generate the object containing all the parameters to pass to the templating engine.
     *
     * @param {?Object.<string, *>} parameters Some additional on-the-fly parameters that will be merged into defined ones.
     * @param {?Context} context An instance of the class context containing the request and response objects obtained from a server.
     *
     * @returns {MergedViewParameters} An object containing all the parameters merged and ready for injection in view layout.
     *
     * @protected
     */
    _prepareParams(parameters, context){
        let contextParams = null, contextInjectedParams = null;
        if ( context !== null ){
            // Extract request and response streams from the given context.
            contextParams = {
                _request: context.getRequest(),
                _response: context.getResponse()
            };
            if ( contextParams._response.hasOwnProperty('viewParams') && typeof contextParams._response.viewParams === 'object' ){
                contextInjectedParams = contextParams._response.viewParams;
            }
        }
        const mergedParameters = {};
        // Merge all the parameters, presenter function and constants into the defined parameters.
        mergedParameters.all = Object.assign({}, this._params, parameters, contextParams, contextInjectedParams, constants);
        mergedParameters.cacheFactors = Object.assign({}, this._params, parameters, contextInjectedParams);
        // Get all the presenter functions registered.
        const presenters = PresentersRepository.getAll();
        // Wraps presenter functions in order to pass all the parameters that will be available into the view.
        for ( const name in presenters ){
            if ( presenters.hasOwnProperty(name) ){
                mergedParameters.all[name] = function(){
                    return presenters[name](mergedParameters.all, ...arguments);
                }
            }
        }
        return mergedParameters;
    }

    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the view file.
     * @param {?Object.<string, *>} [params] An object containing some parameters to pass to the templating engine or null if no parameter should be passed.
     *
     * @throws {RuntimeException} If the class is instantiated directly as it is meant to be an abstract class.
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid object containing parameters is given.
     */
    constructor(path, params = null){
        super(path);

        /**
         * @type {?Object.<string, *>} [_params] An object containing some parameters to pass to the view layout.
         *
         * @protected
         */
        this._params = null;

        // This class is meant to be extended by other classes, then it cannot be instantiated directly.
        if ( new.target === 'ParametrizedView' ){
            throw new RuntimeException('Cannot instance a class that is meant to be abstract.', 1);
        }

        if ( typeof params !== 'object' ){
            throw new InvalidArgumentException('Invalid params.', 3);
        }
        this._params = params;
    }

    /**
     * Sets some parameters to pass to the templating engine making them available within the view layout, this method is chainable.
     *
     * @param {?Object.<string, *>} params An object containing the parameters or null if no parameter should be passed.
     *
     * @returns {ParametrizedView}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setParams(params){
        if ( typeof params !== 'object' ){
            throw new InvalidArgumentException('Invalid params.', 1);
        }
        this._params = params;
        return this;
    }

    /**
     * Returns the parameters that have been defined for this view.
     *
     * @returns {?Object<string, *>} An object containing the parameters or null if no parameter has been defined.
     */
    getParams(){
        return this._params;
    }

    /**
     * Renders the view producing a stream as a result.
     *
     * @param {?Object.<string, *>} [parameters] Some additional on-the-fly parameters that will be merged into defined ones.
     * @param {?Context} [context] An instance of the class context containing the request and response objects obtained from a server.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A readable stream that returns the HTML code produced from the view.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async renderAsStream(parameters = null, context = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }

    /**
     * Renders the view producing a string as a result.
     *
     * @param {?Object.<string, *>} [parameters] Some additional on-the-fly parameters that will be merged into defined ones.
     * @param {?Context} [context] An instance of the class context containing the request and response objects obtained from a server.
     *
     * @returns {Promise<string>} A string containing the HTML code generated from the view.
     *
     * @throws {NotCallableException} If this method is called without been overridden and implemented.
     *
     * @abstract
     * @async
     */
    async renderAsString(parameters = null, context = null){
        throw new NotCallableException('This method cannot be callable, you must extend this class and override this method.', 1);
    }
}

module.exports = ParametrizedView;
