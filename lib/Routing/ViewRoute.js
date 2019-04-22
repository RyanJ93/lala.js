'use strict';

// Including Lala's modules.
const View = require('../View/View');
const BaseRoute = require('./BaseRoute');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 *
 */
class ViewRoute extends BaseRoute {
    /**
     * The class instructor.
     *
     * @param path
     * @param view
     */
    constructor(path, view){
        super();

        /**
         * @type {(View|null)} _view An instance of the class "View" representing the view to render and serve to the client.
         *
         * @private
         */
        this._view = null;

        // As all requests must be done using the GET HTTP method, changing method is not allowed.
        this._method = 'GET';
        delete this.setMethod;
        if ( path !== '' && ( typeof path === 'string' || path instanceof RegExp ) ){
            this.setPath(path);
        }
        if ( view instanceof View ){
            this.setView(view);
        }
    }

    /**
     * Sets the view to render and serve to the client whenever this route gets triggered, this method is chainable.
     *
     * @param {View} view An instance of the class "View" representing the view.
     *
     * @returns {ViewRoute}
     *
     * @throws {InvalidArgumentException} If invalid route object is given.
     */
    setView(view){
        if ( !view instanceof View ){
            throw new InvalidArgumentException('Invalid view object.', 1);
        }
        this._view = view;
        return this;
    }

    /**
     * Generates a view object based on the given template path and then set it within this class instance, this method is chainable.
     *
     * @param {string} path A string containing the path to the template file.
     * @param {{string: *}?} data An optional object containing the parameters to pass to the view when rendered.
     *
     * @returns {ViewRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setViewByPath(path, data){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._view = new View(path, data);
        return this;
    }

    /**
     * Returns the view that will be served to the client whenever this route gets triggered.
     *
     * @returns {(View|null)} An instance of the class "View" representing the view or null if no view has been defined yet.
     */
    getView(){
        return this._view;
    }

    /**
     *
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     *
     * @returns {Promise<(string|null)>}
     *
     * @async
     */
    async execute(request, response){
        if ( this._view === null ){
            return null;
        }
        if ( !response.headersSent ){
            response.setHeader('Content-Type', 'text/html');
        }
        return await this._view.render();
    }
}

module.exports = ViewRoute;