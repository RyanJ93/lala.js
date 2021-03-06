'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const RedirectResponse = require('../Server/responses/RedirectResponse');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * @typedef {BaseRouteOptions} RedirectRouteOptions Defines all the custom options that can be used in redirect route generation.
 *
 * @property {boolean} [permanent=false] If set to "true" will be returned the status code number 308 to the client, otherwise 307 will be used instead.
 */

/**
 * Implements a route that redirects the client to another defined URL whenever gets triggered.
 */
class RedirectRoute extends BaseRoute {
    /**
     * Configure a given route instance according to the given options.
     *
     * @param {RedirectRouteOptions} options An object containing the configuration options the given route will be configured with.
     * @param {RedirectRoute} instance A route instance.
     *
     * @protected
     */
    static _configureInstance(options, instance){
        super._configureInstance(options, instance);
        const permanent = options.hasOwnProperty('permanent') && options.permanent === true;
        instance.setPermanent(permanent);
    }

    /**
     * Generates an instance of this class based on given parameters and options.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {string} target A non empty string containing the path the client should be redirected to whenever this route gets triggered.
     * @param {?RedirectRouteOptions} [options] An optional object containing the additional options for the route that will be generated.
     *
     * @returns {RedirectRoute} The instance of this class that has been generated and configured by this factory method.
     *
     * @throws {InvalidArgumentException} If an empty path is given.
     * @throws {InvalidArgumentException} If an empty target is given.
     * @throws {InvalidArgumentException} If the given options are not valid.
     */
    static craft(path, target, options = null){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 1);
        }
        const route = new RedirectRoute(path, target);
        if ( options !== null ){
            RedirectRoute._configureInstance(options, route);
        }
        return route;
    }

    /**
     * The class constructor.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {string} target A non empty string containing the path the client should be redirected to whenever this route gets triggered.
     * @param {boolean} [permanent=false] If set to "true" will be returned the status code number 308 to the client, otherwise 307 will be used instead.
     *
     * @throws {InvalidArgumentException} If an empty path is given.
     * @throws {InvalidArgumentException} If an empty target is given.
     */
    constructor(path, target, permanent = false){
        super();

        /**
         * @type {?string} _target A non empty string containing the path the client should be redirected to whenever this route gets triggered.
         *
         * @protected
         */
        this._target = null;

        /**
         * @type {boolean} [_permanent=false] Defines which HTTP status code should be returned to the client, 308 if set to "true", 307 otherwise.
         *
         * @protected
         */
        this._permanent = permanent === true;

        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( target === '' || typeof target !== 'string' ){
            throw new InvalidArgumentException('Invalid target.', 1);
        }
        // As all requests must be done using the GET HTTP method, changing method is not allowed.
        this._method = 'GET';
        delete this.setMethod;
        this._path = path;
        this._target = target;
        // Register this route into the global index.
        this._register();
    }

    /**
     * Sets the URL that the client would be redirected to if this route gets triggered, this method is chainable.
     *
     * @param {string} target A string containing the URL where the client should be redirected to.
     *
     * @returns {RedirectRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setTarget(target){
        if ( target === '' || typeof target !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        this._emitUpdateEvent('target', target);
        this._target = target;
        this.emit('updated', 'target');
        return this;
    }

    /**
     * Returns the URL that the client would be redirected to if this route gets triggered.
     *
     * @returns {?string} A string containing the URL defined or null if no URL has been defined.
     */
    getTarget(){
        return this._target;
    }

    /**
     * Sets if the response code for the client should be number "308", indicating a permanent redirect, or number "307", indicating a temporary one, this method is chainable.
     *
     * @param {boolean} permanent If set to "true" this redirect wil be marked as permanent and code number "308" will be returned to the client.
     */
    setPermanent(permanent){
        this._emitUpdateEvent('permanent', permanent);
        this._permanent = permanent === true;
        this.emit('updated', 'permanent');
        return this;
    }

    /**
     * Returns if this redirect has been marked as permanent.
     *
     * @returns {boolean} If this redirect has been marked as permanent will be returned "true".
     */
    getPermanent(){
        return this._permanent === true;
    }

    /**
     * Generates the redirect response that will be processed and propagated to the client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<RedirectResponse>} An instance of the class "RedirectResponse" representing the redirect to be applied.
     *
     * @async
     * @override
     */
    async execute(request, response){
        return this._target === null ? null : new RedirectResponse(this._target, this._permanent);
    }
}

module.exports = RedirectRoute;
