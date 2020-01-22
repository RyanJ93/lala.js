'use strict';

// Including Lala's modules.
const BaseView = require('../View/BaseView');
const View = require('../View/View');
const HTMLView = require('../View/HTMLView');
const Authenticator = require('../Authenticator/Authenticator');
const ParameterizedRoute = require('./ParameterizedRoute');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {ParameterizedRouteOptions} ViewRouteOptions Defines all the custom options that can be used in view route definition.
 *
 * @property {?Object.<string, *>} data An object containing some custom parameter that will be passed to the view.
 * @property {boolean} htmlView If set to "true" it means that a static HTML view should be created from the given file (parameters are ignored in this case).
 */

/**
 * Implements a route that renders and serves a view to the client whenever gets triggered.
 */
class ViewRoute extends ParameterizedRoute {
    /**
     * Ensures the returned object to be a view instance, if necessary, a new instance will be created.
     *
     * @param {(BaseView|string)} view An instance of the view or a non-empty string containing the path to a view file.
     * @param {?Object.<string, *>} data Some custom data to pass to the view object if it is going to be created.
     * @param {boolean} htmlView If set to "true" it means that a static HTML view should be created from the given file.
     *
     * @returns {BaseView} The view object given or generated.
     *
     * @protected
     *
     * @throws {InvalidArgumentException} If the given object is not a valid view or if a view cannot be generated from it.
     */
    static _ensureViewObject(view, data, htmlView){
        if ( !( view instanceof BaseView ) ){
            if ( view === '' || typeof view !== 'string' ){
                throw new InvalidArgumentException('Invalid view.', 1);
            }
            view = htmlView ? new HTMLView(view) : new View(view, data);
        }
        return view;
    }

    /**
     * Generates an instance of this class based on given parameters and options.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {(BaseView|string)} view An instance of the view or a non-empty string containing the path to a view file.
     * @param {?ViewRouteOptions} [options] An optional object containing the additional options for the route that will be generated.
     *
     * @returns {ViewRoute} The instance of this class that has been generated and configured by this factory method.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    static craft(path, view, options = null){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        const data = options.hasOwnProperty('data') ? options.data : null;
        const htmlView = options.hasOwnProperty('htmlView') && options.htmlView === true;
        view = ViewRoute._ensureViewObject(view, data, htmlView);
        const route = new ViewRoute(path, view);
        if ( options.hasOwnProperty('middlewares') && options.middlewares !== null && typeof options.middlewares === 'object' ){
            route.setMiddlewares(options.middlewares);
        }
        if ( options.hasOwnProperty('authenticator') && options.authenticator instanceof Authenticator ){
            route.setAuthenticator(options.authenticator);
        }
        if ( options.hasOwnProperty('name') && options.name !== '' && typeof options.name === 'string' ){
            route.setName(options.name);
        }
        if ( options.hasOwnProperty('filters') && options.filters !== null && typeof options.filters === 'object' ){
            route.setParameterFilters(options.filters);
        }
        if ( options.hasOwnProperty('language') && options.language !== '' && typeof options.language === 'string' ){
            route.setLanguage(options.language);
        }
        if ( options.hasOwnProperty('permissions') ){
            if ( options.permissions instanceof Set ){
                route.setPermissions(options.permissions);
            }else if ( Array.isArray(options.permissions) ){
                route.setPermissionsAsArray(options.permissions);
            }
        }
        if ( options.hasOwnProperty('policies') ){
            if ( options.policies instanceof Map ){
                route.setPolicies(options.policies);
            }else if ( options.policies !== null && typeof options.policies === 'object' ){
                route.setPoliciesAsObject(options.policies);
            }
        }
        if ( options.hasOwnProperty('paramMiddlewares') && Array.isArray(options.paramMiddlewares) ){
            route.setParamMiddlewares(options.paramMiddlewares);
        }
        const auth = options.hasOwnProperty('auth') ? ( options.auth === true ? true : ( options.auth === false ? false : null ) ) : null;
        route.setAuth(auth);
        return route;
    }

    /**
     * The class instructor.
     *
     * @param {(string|RegExp)} path A non empty string containing the path to this route.
     * @param {BaseView} view An instance of the view to render and serve to the client whenever this route gets triggered.
     *
     * @throws {InvalidArgumentException} If invalid view object is given.
     */
    constructor(path, view){
        super();

        /**
         * @type {BaseView} [_view] An instance of the view to render and serve to the client.
         *
         * @protected
         */
        this._view = null;

        if ( !( view instanceof BaseView ) ){
            throw new InvalidArgumentException('Invalid view object.', 1);
        }
        // As all requests must be done using the GET HTTP method, changing method is not allowed.
        this._method = 'GET';
        delete this.setMethod;
        if ( path !== '' && ( typeof path === 'string' || path instanceof RegExp ) ){
            this.setPath(path);
        }
        this._view = view;
        // Register this route into the global index.
        this._register();
    }

    /**
     * Sets the view to render and serve to the client whenever this route gets triggered, this method is chainable.
     *
     * @param {BaseView} view An instance of the view.
     *
     * @returns {ViewRoute}
     *
     * @throws {InvalidArgumentException} If invalid view object is given.
     */
    setView(view){
        if ( !view instanceof BaseView ){
            throw new InvalidArgumentException('Invalid view object.', 1);
        }
        this._emitUpdateEvent('view', view);
        this._view = view;
        this.emit('updated', 'view');
        return this;
    }

    /**
     * Generates a view object based on the given template path and then set it within this class instance, this method is chainable.
     *
     * @param {string} path A string containing the path to the template file.
     * @param {?Object.<string, *>} [data] An optional object containing the parameters to pass to the view when rendered.
     * @param {boolean} [htmlView=false] If set to "true" it means that a static HTML view should be created from the given file (parameters are ignored in this case).
     *
     * @returns {ViewRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setViewByPath(path, data = null, htmlView = false){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        // Generate the view object from the given path.
        const view = htmlView === true ? new HTMLView(path) : new View(path, data);
        this.setView(view);
        return this;
    }

    /**
     * Returns the view that will be served to the client whenever this route gets triggered.
     *
     * @returns {BaseView} An instance of the view defined.
     */
    getView(){
        return this._view;
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
        return this._view;
    }
}

module.exports = ViewRoute;
