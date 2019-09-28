'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const Authenticator = require('../Authenticator/Authenticator');
const FileResponse = require('../Server/responses/FileResponse');
const {
    InvalidArgumentException,
    NotFoundHTTPException,
    BadMethodCallException
} = require('../Exceptions');

/**
 * @typedef {BaseRouteOptions} ResourceRouteOptions Defines all the custom options that can be used in resource route definition.
 */

/**
 * Represents a route representing a directory containing static assets that can be served to the client.
 */
class ResourceRoute extends BaseRoute {
    /**
     * Generates an instance of this class based on given parameters and options.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {string} location A non empty string containing the path where resources associated to this route are stored in.
     * @param {?ResourceRouteOptions} [options] An optional object containing the additional options for the route that will be generated.
     *
     * @returns {ResourceRoute} The instance of this class that has been generated and configured by this factory method.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     * @throws {InvalidArgumentException} If an invalid location path is given.
     */
    static craft(path, location, options = null){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( location === '' || typeof location !== 'string' ){
            throw new InvalidArgumentException('Invalid location path.', 2);
        }
        const route = new ResourceRoute(path, location);
        if ( options === null || typeof options !== 'object' ){
            options = {};
        }
        if ( options.hasOwnProperty('middlewares') && options.middlewares !== null && typeof options.middlewares === 'object' ){
            route.setMiddlewares(options.middlewares);
        }
        if ( options.hasOwnProperty('authenticator') && options.authenticator instanceof Authenticator ){
            route.setAuthenticator(options.authenticator);
        }
        if ( options.hasOwnProperty('name') && options.name !== '' && typeof options.name === 'string' ){
            route.setName(options.name);
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
        const auth = options.hasOwnProperty('auth') ? ( options.auth === true ? true : ( options.auth === false ? false : null ) ) : null;
        route.setAuth(auth);
        return route;
    }

    /**
     * The class constructor.
     *
     * @param {string} path A non empty string containing the path to this route.
     * @param {string} location A non empty string containing the path where resources associated to this route are stored in.
     */
    constructor(path, location){
        super();

        /**
         * @type {?string} _location A string containing the path to the directory where resource assets are located at.
         *
         * @private
         */
        this._location = null;

        // As all requests must be done using the GET HTTP method, changing method is not allowed.
        this._method = 'GET';
        delete this.setMethod;
        this._allowParameters = false;
        // Set given parameters.
        if ( path !== '' && typeof path === 'string' ){
            this.setPath(path);
        }
        if ( location !== '' && typeof location === 'string' ){
            this.setLocation(location);
        }
        // Register this route into the global index.
        this._register();
    }

    /**
     * Sets the path that will trigger this route whenever a request occurs, this method is chainable.
     *
     * @param {string} path A string representing the path to the route.
     *
     * @returns {ResourceRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setPath(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        super.setPath(path);
        return this;
    }

    /**
     * Sets the location where resource assets are located at, this method is chainable.
     *
     * @param {string} location A string containing the path to the directory.
     *
     * @return {ResourceRoute}
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    setLocation(location){
        if ( location === '' || typeof location !== 'string' ){
            throw new InvalidArgumentException('Invalid location path.', 1);
        }
        this._emitUpdateEvent('location', location);
        this._location = location;
        this.emit('updated', 'location');
        return this;
    }

    /**
     * Returns the location where resource assets are located at.
     *
     * @return {?string} A string containing the path to the directory or null if no path has been defined yet.
     */
    getLocation(){
        return this._location;
    }

    /**
     * Generates and returns a path that can be used in a request to trigger this route.
     *
     * @param {string} path A string containing the path to the asset.
     *
     * @returns {?string} A string containing the path or null if no path has been defined for this route.
     */
    compile(path){
        const directory = super.compile();
        return directory.charAt(directory.length - 1) === '/' ? ( directory + path ) : ( directory + '/' + path );
    }

    /**
     * Generates the object that wraps the file to send back to the client.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<FileResponse>} An instance of the class "FileResponse" representing the file to send back to the client.
     *
     * @throws {BadMethodCallException} If no resolved route is found within the given request object.
     * @throws {NotFoundHTTPException} If file defined in the resolved route found does not exist.
     *
     * @async
     * @override
     */
    async execute(request, response){
        const resolvedRouteClass = require('./ResolvedRoute');
        if ( !request.hasOwnProperty('resolvedRoute') || !( request.resolvedRoute instanceof resolvedRouteClass ) ){
            throw new BadMethodCallException('Given request does not contain a valid resolved route.', 1);
        }
        // Get the path to the original file to return.
        const path = this.getLocation() + '/' + request.resolvedRoute.getPath();
        if ( !filesystem.existsSync(path) ){
            // If this file doesn't exist just throw a 404.
            throw new NotFoundHTTPException('The requested resource was not found.', 2);
        }
        // Generate a file response in order to allow the output processor to send this file to the client.
        return new FileResponse(path);
    }
}

module.exports = ResourceRoute;
