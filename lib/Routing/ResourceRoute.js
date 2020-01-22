'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const Authenticator = require('../Authenticator/Authenticator');
const FileResponse = require('../Server/responses/FileResponse');
const DirectoryIndexerFactory = require('../Server/support/directoryIndexer/DirectoryIndexerFactory');
const BaseDirectoryIndexerFactory = require('../Server/support/directoryIndexer/BaseDirectoryIndexerFactory');
const {
    InvalidArgumentException,
    NotFoundHTTPException,
    BadMethodCallException,
    ForbiddenHTTPException
} = require('../Exceptions');

/**
 * @typedef {BaseRouteOptions} ResourceRouteOptions Defines all the custom options that can be used in resource route definition.
 *
 * @property {boolean} [directoryListing=false] If set to "true" directory content will be displayed to the client, otherwise a 403 error will be returned.
 * @property {BaseDirectoryIndexerFactory} directoryIndexerFactory An instance of the class that will be used to generate the instances of the class used to list files.
 * @property {boolean} [serveHiddenFiles=false] If set to "true" files which name start with "." or contained in a directory having "." as first character in their name will be served, otherwise 403 error will be returned.
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
        route.setDirectoryListing(options.hasOwnProperty('directoryListing') && options.directoryListing === true);
        if ( options.hasOwnProperty('directoryIndexerFactory') && options.directoryIndexerFactory instanceof BaseDirectoryIndexerFactory ){
            route.setDirectoryIndexerFactory(options.directoryIndexerFactory);
        }
        route.setServeHiddenFiles(options.hasOwnProperty('serveHiddenFiles') && options.serveHiddenFiles === true);
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
         * @protected
         */
        this._location = null;

        /**
         * @type {boolean} [_directoryListing=false] If set to "true" directory content will be displayed to the client, otherwise a 403 error will be returned.
         *
         * @protected
         */
        this._directoryListing = false;

        /**
         * @type {BaseDirectoryIndexerFactory} _directoryIndexerFactory An instance of the class that will be used to generate the instances of the class used to list files.
         *
         * @protected
         */
        this._directoryIndexerFactory = new DirectoryIndexerFactory();

        /**
         * @type {boolean} [_serveHiddenFiles=false] If set to "true" files which name start with "." or contained in a directory having "." as first character in their name will be served, otherwise 403 error will be returned.
         *
         * @protected
         */
        this._serveHiddenFiles = false;

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
     * Sets if directory content should be displayed to the client or those requests should be blocked, this method is chainable.
     *
     * @param directoryListing If set to "true" directory content will be displayed to the client, otherwise a 403 error will be returned.
     *
     * @returns {ResourceRoute}
     */
    setDirectoryListing(directoryListing){
        this._directoryListing = directoryListing === true;
        return this;
    }

    /**
     * Returns if directory content should be displayed to the client or not.
     *
     * @returns {boolean} If directory listing is enabled will be returned "true".
     */
    getDirectoryListing(){
        return this._directoryListing === true;
    }

    /**
     * Sets the object to use to build the indexer instance that implements the directory listing mechanism, this method is chainable.
     *
     * @param {BaseDirectoryIndexerFactory} directoryIndexerFactory An instance of the class that implements the indexer factory, it must extend the "BaseDirectoryIndexerFactory" class.
     *
     * @returns {ResourceRoute}
     *
     * @throws {InvalidArgumentException} If an invalid factory instance is given.
     */
    setDirectoryIndexerFactory(directoryIndexerFactory){
        if ( !( directoryIndexerFactory instanceof BaseDirectoryIndexerFactory ) ){
            throw new InvalidArgumentException('Invalid indexer instance.');
        }
        this._directoryIndexerFactory = directoryIndexerFactory;
        return this;
    }

    /**
     * Returns the object used to build the indexer instance used in directory listing.
     *
     * @returns {BaseDirectoryIndexerFactory} An instance of the factory class defined.
     */
    getDirectoryIndexerFactory(){
        return this._directoryIndexerFactory;
    }

    /**
     * Sets if hidden files should be served as well as visible ones, this method is chainable.
     *
     * @param {boolean} serveHiddenFiles If set to "true" hidden files will be served, otherwise 403 code will be returned instead.
     *
     * @returns {ResourceRoute}
     */
    setServeHiddenFiles(serveHiddenFiles){
        this._serveHiddenFiles = serveHiddenFiles === true;
        return this;
    }

    /**
     * Returns if hidden files are served or not.
     *
     * @returns {boolean} If hidden files are served will be returned "true".
     */
    getServeHiddenFiles(){
        return this._serveHiddenFiles === true;
    }

    /**
     * Checks if a given path is hidden or not according to UNIX file name notation.
     *
     * @param {string} path A string containing the path to check.
     *
     * @returns {boolean} If given path is hidden will be returned "true".
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    isHidden(path){
        if ( typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        let hidden = false;
        // Split the path in order to extract file and sub folder names.
        const components = ( this._location + '/' + path ).split('/'), length = components.length;
        let i = 0;
        // Iterate each container folder in the hierarchy, if at least a folder is hidden, then the file is hidden.
        while ( hidden === false && i < length ){
            if ( components[i].charAt(0) === '.' && ( components[i] !== '.' && components[i] !== '..' ) ){
                // If current folder is hidden mark the whole path as hidden.
                hidden = true;
            }
            i++;
        }
        return hidden;
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
     * @throws {ForbiddenHTTPException} If current request path leads to a directory and directory listing is disabled.
     * @throws {ForbiddenHTTPException} If current request path leads to a hidden file and hidden file serve is disabled.
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
        const requestPath = request.resolvedRoute.getPath();
        // Check if current file is hidden and is it can be served.
        if ( this._serveHiddenFiles !== true && this.isHidden(requestPath) ){
            throw new ForbiddenHTTPException('Cannot access to an hidden file.', 4);
        }
        const path = this._location + '/' + requestPath;
        if ( !filesystem.existsSync(path) ){
            // If this file doesn't exist just throw a 404.
            throw new NotFoundHTTPException('The requested resource was not found.', 2);
        }
        let responseObj = null;
        const stat = filesystem.statSync(path);
        if ( stat.isDirectory() ){
            if ( this._directoryListing === true ){
                const directoryIndexer = this._directoryIndexerFactory.craft();
                responseObj = await directoryIndexer.index(path, request, response);
            }else{
                throw new ForbiddenHTTPException('Cannot access to a directory.', 3);
            }
        }else{
            // Generate a file response in order to allow the output processor to send this file to the client.
            responseObj = new FileResponse(path, null, false);
        }
        return responseObj;
    }
}

module.exports = ResourceRoute;
