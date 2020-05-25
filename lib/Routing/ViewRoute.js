'use strict';

// Including Lala's modules.
const BaseViewFactory = require('../View/BaseViewFactory');
const ParametrizedViewFactory = require('../View/ParametrizedViewFactory');
const ViewFactory = require('../View/ViewFactory');
const HTMLViewFactory = require('../View/HTMLViewFactory');
const ParameterizedRoute = require('./ParameterizedRoute');
const Context = require('../Types/Context');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {ParameterizedRouteOptions} ViewRouteOptions Defines all the custom options that can be used in view route definition.
 *
 * @property {?Object.<string, *>} data An object containing some custom parameter that will be passed to the view.
 * @property {?boolean} [htmlView=false] If set to "true" it means that a static HTML view should be created from the given file (parameters are ignored in this case).
 */

/**
 * Implements a route that renders and serves a view to the client whenever gets triggered.
 */
class ViewRoute extends ParameterizedRoute {
    /**
     * Configure a given route instance according to the given options.
     *
     * @param {ViewRouteOptions} options An object containing the configuration options the given route will be configured with.
     * @param {ViewRoute} instance A route instance.
     *
     * @protected
     */
    static _configureInstance(options, instance){
        super._configureInstance(options, instance);
    }

    /**
     * Ensures the returned object to be a view factory instance, if necessary, a new instance will be created.
     *
     * @param {(BaseViewFactory|string)} viewFactory An instance of the view factory or a non-empty string containing the path to a view file.
     * @param {?Object.<string, *>} data Some custom data to pass to the view object if it is going to be created.
     * @param {boolean} htmlView If set to "true" it means that a static HTML view should be created from the given file.
     *
     * @returns {BaseViewFactory} The view factory given or generated.
     *
     * @protected
     *
     * @throws {InvalidArgumentException} If the given object is not a valid view factory or if a view cannot be generated from it.
     */
    static _ensureViewObject(viewFactory, data, htmlView){
        if ( !( viewFactory instanceof BaseViewFactory ) ){
            if ( viewFactory === '' || typeof viewFactory !== 'string' ){
                throw new InvalidArgumentException('Invalid view.', 1);
            }
            if ( htmlView === true ){
                viewFactory = new HTMLViewFactory(viewFactory);
            }else{
                viewFactory = new ViewFactory(viewFactory);
                viewFactory.setStaticParams(data);
            }
        }
        return viewFactory;
    }

    /**
     * Generates an instance of this class based on given parameters and options.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {(BaseViewFactory|string)} viewFactory An instance of the view factory or a non-empty string containing the path to a view file.
     * @param {?ViewRouteOptions} [options] An optional object containing the additional options for the route that will be generated.
     *
     * @returns {ViewRoute} The instance of this class that has been generated and configured by this factory method.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If the given options are not valid.
     * @throws {InvalidArgumentException} If the given object is not a valid view factory or if a view cannot be generated from it.
     */
    static craft(path, viewFactory, options = null){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 1);
        }
        let data = null, htmlView = false;
        if ( options !== null ){
            data = options.hasOwnProperty('data') ? options.data : null;
            htmlView = options.hasOwnProperty('htmlView') && options.htmlView === true;
        }
        viewFactory = ViewRoute._ensureViewObject(viewFactory, data, htmlView);
        const route = new ViewRoute(path, viewFactory);
        if ( options !== null ){
            ViewRoute._configureInstance(options, route);
        }
        return route;
    }

    /**
     * The class instructor.
     *
     * @param {(string|RegExp)} path A non empty string containing the path to this route.
     * @param {BaseViewFactory} viewFactory An instance of the view to render and serve to the client whenever this route gets triggered.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If invalid view object is given.
     */
    constructor(path, viewFactory){
        super();

        /**
         * @type {BaseViewFactory} [_viewFactory] An instance of the view factory to use to generate ehe view to render and serve.
         *
         * @protected
         */
        this._viewFactory = null;

        if ( !( viewFactory instanceof BaseViewFactory ) ){
            throw new InvalidArgumentException('Invalid view object.', 1);
        }
        // As all requests must be done using the GET HTTP method, changing method is not allowed.
        this._method = 'GET';
        delete this.setMethod;
        if ( path !== '' && ( typeof path === 'string' || path instanceof RegExp ) ){
            this.setPath(path);
        }
        this._viewFactory = viewFactory;
        // Register this route into the global index.
        this._register();
    }

    /**
     * Sets the factory that generates the view to serve, this method is chainable.
     *
     * @param {BaseViewFactory} viewFactory An instance of the view factory to use.
     *
     * @returns {ViewRoute}
     *
     * @throws {InvalidArgumentException} If invalid view factory is given.
     */
    setViewFactory(viewFactory){
        if ( !viewFactory instanceof BaseViewFactory ){
            throw new InvalidArgumentException('Invalid view factory.', 1);
        }
        this._emitUpdateEvent('viewFactory', viewFactory);
        this._viewFactory = viewFactory;
        this.emit('updated', 'viewFactory');
        return this;
    }

    /**
     * Generates a view factory based on the given template path and then set it within this class instance, this method is chainable.
     *
     * @param {string} path A string containing the path to the template file.
     * @param {?Object.<string, *>} [params] An optional object containing the parameters to pass to the view when rendered.
     * @param {boolean} [htmlView=false] If set to "true" it means that a static HTML view should be created from the given file (parameters are ignored in this case).
     *
     * @returns {ViewRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setViewByPath(path, params = null, htmlView = false){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        // Generate the view object from the given path.
        let viewFactory;
        if ( htmlView === true ){
            viewFactory = new HTMLViewFactory(path);
        }else{
            viewFactory = new ViewFactory(path);
            viewFactory.setStaticParams(params);
        }
        this.setViewFactory(viewFactory);
        return this;
    }

    /**
     * Returns the factory that generates the view to serve.
     *
     * @returns {BaseViewFactory} An instance of the view factory defined.
     */
    getViewFactory(){
        return this._viewFactory;
    }

    /**
     * Returns currently defined view as its rendering is made by the output processor.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<?BaseView>} The original view object or null if no view has been defined yet.
     *
     * @async
     * @override
     */
    async execute(request, response){
        // Validate incoming data according to the defined form.
        await this._processForm(request, response);
        let view;
        if ( this._viewFactory instanceof ParametrizedViewFactory ){
            view = this._viewFactory.craft(null, new Context(request, response));
        }else{
            view = this._viewFactory.craft();
        }
        return view;
    }
}

module.exports = ViewRoute;
