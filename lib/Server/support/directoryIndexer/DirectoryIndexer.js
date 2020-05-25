'use strict';

// Including native modules.
const filesystem = require('fs');
const querystring = require('querystring');

// Including Lala's modules.
const BaseDirectoryIndexer = require('./BaseDirectoryIndexer');
const ViewFactory = require('../../../View/ViewFactory');
const ParametrizedViewFactory = require('../../../View/ParametrizedViewFactory');
const Context = require('../../../Types/Context');
const { sizeToHumanReadableValue } = require('../../../Helpers/helpers/BuiltInHelpers');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * @typedef {BaseDirectoryIndexerConfiguration} DirectoryIndexerConfiguration An object containing all the properties supported by this class.
 *
 * @property {boolean} [paging=true] If set to "true" files will be split into pages.
 * @property {number} [pageSize=20] An integer number greater than zero representing the maximum number of entries that can be contained in a single page.
 * @property {boolean} [search=true] If set to "true" a file can be looked up by its name if the "q" GET parameter is set.
 * @property {ParametrizedViewFactory} viewFactory An instance of the class "View" representing the HTML page used to display entries.
 * @property {boolean} [showHiddenFiles=false] If set to "true" files starting by "." or contained in a parent directory starting by "." will be displayed too.
 * @property {boolean} [ordering=true] If set to "true" file list can be ordered by the user.
 * @property {string} [order="name"] A string containing the name of the default ordering to apply to the file list.
 * @property {number} [orderDirection=1] An integer number representing the ordering direction, 1 for ascending order, -1 for descending one.
 * @property {boolean} [showFileInfo=true] If set to "true" additional file information, such as size, creation and last modified date will be displayed alongside files.
 */

/**
 * @typedef {Object} FileEntry An object containing all the properties associated to a single file from a scanned directory.
 *
 * @property {string} filename A string representing the file name.
 * @property {string} url A string containing the whole relative URL to this file according to current route.
 * @property {string} size A string containing a human readable representation of the file size (if additional file information has been enabled).
 * @property {Object.<string, *>} sortable An object containing all the properties that can be used to sort the file list.
 * @property {Object.<string, *>} searchable An object containing all the properties that can be checked in file search.
 * @property {?module:fs.Stats} stat An instance of the native class "Stats" representing some additional file information.
 * @property {?boolean} [directory] Indicates if current entry is a directory, if "showFileInfo" is disabled this information will be omitted.
 */

/**
 * Allows to list all the files contained in a given directory and display them to the user as a HTML page.
 */
class DirectoryIndexer extends BaseDirectoryIndexer {
    /**
     * Checks if a given order name is supported by this class.
     *
     * @param {string} order A string containing the name of the order to check.
     *
     * @returns {boolean} If the given order is a valid order will be returned "true".
     */
    static isSupportedOrder(order){
        return ['name', 'size', 'creation_date', 'last_modified_date'].indexOf(order) >= 0;
    }

    /**
     * Returns all the properties supported by this class and their default values.
     *
     * @returns {DirectoryIndexerConfiguration} An object containing as key the property name and as value its default value.
     *
     * @override
     */
    static getDefaultConfiguration(){
        const baseConfig = super.getDefaultConfiguration();
        return Object.assign({
            paging: true,
            pageSize: 20,
            search: true,
            viewFactory: new ViewFactory(__dirname + '/../../resources/default_directory_indexer.ejs'),
            showHiddenFiles: false,
            showFileInfo: true,
            ordering: true,
            order: 'name',
            orderDirection: 1
        }, baseConfig);
    }

    /**
     * Extracts the search query from the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _extractSearchQuery(request){
        this._searchQuery = this._search === true && typeof request.query.q === 'string' && request.query.q !== '' ? request.query.q : null;
    }

    /**
     * Extracts the sorting settings from the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _extractOrderingProperties(request){
        let order = this._order, orderDirection = this._orderDirection;
        if ( this._ordering === true ){
            // Extract and validate sorting field from client's query string.
            if ( typeof request.query.order === 'string' && DirectoryIndexer.isSupportedOrder(request.query.order) ){
                order = request.query.order;
            }
            const dir = typeof request.query.order_direction === 'string' ? request.query.order_direction.toLowerCase() : '';
            if ( dir === '1' || dir === 'asc' || dir === '-1' || dir === 'desc' ){
                orderDirection = dir === '-1' || dir === 'desc' ? -1 : 1;
            }
        }
        this._currentOrder = order;
        this._currentOrderDirection = orderDirection;
    }

    /**
     * Extracts the page number from the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _extractPagingProperties(request){
        let page = null;
        if ( this._paging === true ){
            // If record pagination is turned on, then check for a page number in GET parameters to parse.
            page = typeof request.query.page === 'undefined' ? 1 : parseInt(request.query.page);
            if ( isNaN(page) || page <= 0 ){
                page = 1;
            }
        }
        this._currentPage = page;
    }

    /**
     * Extracts the directory alias according to current request URL.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _extractAliasPath(request){
        const url = request.hasOwnProperty('originalURL') ? request.originalURL : request.url;
        const index = url.indexOf('?');
        this._aliasPath = index === -1 ? url : url.substr(0, index);
    }

    /**
     * Applies all the filters detected, such as search query, to a given file list.
     *
     * @param {FileEntry[]} list An array of object representing the file list to process.
     *
     * @returns {FileEntry[]} The processed file list.
     *
     * @protected
     */
    _applyFilters(list){
        list = list.filter((file) => {
            // Skip hidden files if they must not be returned, hidden files, according to UNIX-like notation, must start by ".".
            let valid = this._showHiddenFiles === true || file.filename.charAt(0) !== '.';
            if ( valid && this._searchQuery !== null ){
                // A search query has ben defined, filter out files not having at least one searchable property matching current search query.
                let matches = false;
                for ( const prop in file.searchable ){
                    // Loop each searchable property and compare it with current search query.
                    if ( file.searchable.hasOwnProperty(prop) && file.searchable[prop].indexOf(this._searchQuery) >= 0 ){
                        matches = true;
                        break;
                    }
                }
                valid = matches;
            }
            return valid;
        });
        return list;
    }

    /**
     * Applies the sorting settings that have been defined to a given list of files.
     *
     * @param {FileEntry[]} list An array of object representing the file list to process.
     *
     * @returns {FileEntry[]} The ordered list.
     *
     * @protected
     */
    _applyOrdering(list){
        if ( this._ordering === true ){
            // As sorting capability has been enabled, apply sorting settings to the given list.
            list = list.sort((a, b) => {
                let result = 0;
                if ( this._currentOrderDirection === 1 ){
                    // Ascending sorting.
                    if ( a.sortable[this._currentOrder] > b.sortable[this._currentOrder] ){
                        result = 1;
                    }else if ( a.sortable[this._currentOrder] < b.sortable[this._currentOrder] ){
                        result = -1;
                    }
                }else{
                    // Descending sorting.
                    if ( a.sortable[this._currentOrder] > b.sortable[this._currentOrder] ){
                        result = -1;
                    }else if ( a.sortable[this._currentOrder] < b.sortable[this._currentOrder] ){
                        result = 1;
                    }
                }
                return result;
            });
        }
        return list;
    }

    /**
     * Adds file information to each file contained in a given file list.
     *
     * @param {FileEntry[]} list An array of object representing the file list to process.
     *
     * @returns {Promise<void>}
     *
     * @async
     * @protected
     */
    async _addFileInfo(list){
        if ( this._showFileInfo === true ){
            const processes = [];
            const length = list.length;
            for ( let i = 0 ; i < length ; i++ ){
                // Fetch file information for ach file contained in the given list in parallel way.
                processes.push(filesystem.promises.stat(this._path + '/' + list[i].filename));
            }
            // Wait for all the processes to complete.
            const info = await Promise.all(processes);
            for ( let i = 0 ; i < length ; i++ ){
                // Attach a full copy of the obtained object.
                list[i].stat = info[i];
                list[i].directory = info[i].isDirectory();
                list[i].size = sizeToHumanReadableValue(info[i].size);
                // Add the additional properties this file can be ordered by.
                list[i].sortable.size = info[i].size;
                list[i].sortable.creation_date = info[i].birthtimeMs;
                list[i].sortable.last_modified_date = info[i].mtimeMs;
            }
        }
    }

    /**
     * Generates the list of all the files contained in the path that has been set in this class instance.
     *
     * @returns {Promise<FileEntry[]>} The file list after applying filters and sort order.
     *
     * @async
     * @protected
     */
    async _getFileList(){
        const base = this._aliasPath === '/' ? this._aliasPath : ( this._aliasPath + '/' );
        // List all the files contained in current directory.
        let entries = await filesystem.promises.readdir(this._path);
        entries = entries.map((entry) => {
            return {
                filename: entry,
                url: ( base + entry ),
                sortable: {
                    name: entry
                },
                searchable: {
                    name: entry
                },
                stat: null,
                directory: null
            }
        });
        // Filter out entries that does not match defined filters.
        entries = this._applyFilters(entries);
        // Extract some additional file information.
        await this._addFileInfo(entries);
        // Apply all the filters over again as new file information has been added.
        entries = this._applyFilters(entries);
        // Order the final file list.
        entries = this._applyOrdering(entries);
        if ( this._currentPage !== null ){
            // Ensure both current path and route path to end with "/".
            const aliasPath = this._aliasPath.charAt(this._aliasPath.length - 1) === '/' ? this._aliasPath : ( this._aliasPath + '/' );
            let routePath = this._route.getPath();
            if ( routePath.charAt(routePath.length - 1) !== '/' ){
                routePath += '/';
            }
            if ( aliasPath !== routePath && aliasPath.indexOf(routePath) === 0 && aliasPath.length > routePath.length ){
                // Alias path starts by the route path (but is longer), then current alias path is a sub directory.
                const index = aliasPath.substr(0, aliasPath.length - 1).lastIndexOf('/');
                // Get the parent directory path.
                const prev = aliasPath.substr(0, index);
                // Current alias path isn't the root directory, then append the "../" directory to navigate backward.
                entries.unshift({
                    filename: '../',
                    url: ( prev === '' ? '/' : prev ),
                    sortable: {},
                    searchable: {},
                    stat: null,
                    directory: true
                });
            }
            // Paging is enabled: compute the total number of pages this list will be split into.
            this._pages = this._paging === true ? ( Math.ceil(entries.length / this._pageSize) ) : null;
            // Cut the file list according to pagination settings.
            entries = entries.slice(( ( this._currentPage - 1 ) * this._pageSize ), this._currentPage * this._pageSize);
        }
        return entries;
    }

    /**
     * Initializes all the internal properties based on settings and current request parameters.
     *
     * @param {string} path A string containing the path to the directory to list.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     *
     * @protected
     */
    _initProperties(path, request){
        this._path = path;
        this._route = request.resolvedRoute.getRoute();
        this._raw = request.query.raw === 'true' || request.query.raw === '1';
        this._extractAliasPath(request);
        this._extractSearchQuery(request);
        this._extractOrderingProperties(request);
        this._extractPagingProperties(request);
    }

    /**
     * The class constructor.
     *
     * @param {?DirectoryIndexerConfiguration} [configuration=null] An object containing the values for class properties.
     */
    constructor(configuration = null){
        super(configuration);

        /**
         * @type {boolean} [_paging=true] If set to "true" files will be split into pages.
         *
         * @protected
         */
        this._paging = true;

        /**
         * @type {number} [_pageSize=20] An integer number greater than zero representing the maximum number of entries that can be contained in a single page.
         *
         * @protected
         */
        this._pageSize = 20;

        /**
         * @type {boolean} [_search=true] If set to "true" a file can be looked up by its name if the "q" GET parameter is set.
         *
         * @protected
         */
        this._search = true;

        /**
         * @type {ParametrizedViewFactory} _viewFactory An instance of the class "ParametrizedViewFactory" representing the constructor of the view used to display entries.
         *
         * @protected
         */
        this._viewFactory = new ViewFactory(__dirname + '/../resources/default_directory_indexer.ejs');

        /**
         * @type {boolean} [_showHiddenFiles=true] If set to "true" files starting by "." or contained in a parent directory starting by "." will be displayed too.
         *
         * @protected
         */
        this._showHiddenFiles = true;

        /**
         * @type {boolean} [_showFileInfo=true] If set to "true" additional file information, such as size, creation and last modified date will be displayed alongside files.
         *
         * @protected
         */
        this._showFileInfo = true;

        /**
         * @type {boolean} [_ordering=true] If set to "true" file list can be ordered by the user.
         *
         * @protected
         */
        this._ordering = true;

        /**
         * @type {string} [_order="name"] A string containing the name of the default ordering to apply to the file list.
         *
         * @protected
         */
        this._order = 'name';

        /**
         * @type {number} [_orderDirection=1] An integer number representing the ordering direction, 1 for ascending order, -1 for descending one.
         *
         * @protected
         */
        this._orderDirection = 1;

        /**
         * @type {?string} [_path] A string containing the path files being displayed come from.
         *
         * @protected
         */
        this._path = null;

        /**
         * @type {string} [_currentOrder="name"] A string containing the name of the field file list is currently sorted by.
         *
         * @protected
         */
        this._currentOrder = 'name';

        /**
         * @type {number} [_currentOrderDirection=1] An integer number representing the direction file list is currently sorted by.
         *
         * @protected
         */
        this._currentOrderDirection = 1;

        /**
         * @type {?BaseRoute} [_route] The route this class instance is being used by.
         *
         * @protected
         */
        this._route = null;

        /**
         * @type {boolean} [_raw=false] If set to "true" fill list will be returned as a raw array, otherwise a view displaying the list will be returned instead.
         *
         * @protected
         */
        this._raw = false;

        /**
         * @type {?string} [_searchQuery] A string containing the query files should be filtered by according to client request.
         *
         * @protected
         */
        this._searchQuery = null;

        /**
         * @type {?number} [_currentPage] An integer number representing the number of the page to show up in list pagination context according to current client request.
         *
         * @protected
         */
        this._currentPage = null;

        /**
         * @type {?string} [_aliasPath] A string containing the virtual path extracted from current request URL.
         *
         * @protected
         */
        this._aliasPath = null;

        if ( configuration !== null && typeof configuration === 'object' ){
            // Setup internal properties.
            this.configure(configuration);
        }
    }

    /**
     * Configures internal properties based on the configuration object given, this method is chainable.
     *
     * @param {DirectoryIndexerConfiguration} configuration An object containing the values for class properties.
     *
     * @returns {DirectoryIndexer}
     *
     * @throws {InvalidArgumentException} If an invalid configuration object is given.
     *
     * @override
     */
    configure(configuration){
        super.configure(configuration);
        if ( configuration.hasOwnProperty('paging') && typeof configuration.paging === 'boolean' ){
            this._paging = configuration.paging;
        }
        if ( configuration.hasOwnProperty('pageSize') && typeof configuration.pageSize === 'number' && configuration.pageSize > 0 ){
            this._pageSize = configuration.pageSize;
        }
        if ( configuration.hasOwnProperty('search') && typeof configuration.search === 'boolean' ){
            this._search = configuration.search;
        }
        if ( configuration.hasOwnProperty('viewFactory') && configuration.viewFactory instanceof ParametrizedViewFactory ){
            this._viewFactory = configuration.viewFactory;
        }
        if ( configuration.hasOwnProperty('showHiddenFiles') && typeof configuration.showHiddenFiles === 'boolean' ){
            this._showHiddenFiles = configuration.showHiddenFiles;
        }
        if ( configuration.hasOwnProperty('showFileInfo') && typeof configuration.showFileInfo === 'boolean' ){
            this._showFileInfo = configuration.showFileInfo;
        }
        if ( configuration.hasOwnProperty('ordering') && DirectoryIndexer.isSupportedOrder(configuration.ordering) ){
            this._ordering = configuration.ordering;
        }
        if ( configuration.hasOwnProperty('orderDirection') && ( configuration.orderDirection === 1 || configuration.orderDirection === -1 ) ){
            this._orderDirection = configuration.orderDirection;
        }
        return this;
    }

    /**
     * Returns if results paging is enabled or not.
     *
     * @returns {boolean} If result paging is enabled will be returned "true".
     */
    isPagingEnabled(){
        return this._paging === true;
    }

    /**
     * Returns the maximum amount of records that can be contained in a single page.
     *
     * @returns {number} An integer number representing the amount of records.
     */
    getPageSize(){
        return this._pageSize;
    }

    /**
     * Returns if search has been enabled or not.
     *
     * @returns {boolean} If search has been enabled will be returned "true".
     */
    isSearchEnabled(){
        return this._search === true;
    }

    /**
     * Returns the view object being used.
     *
     * @returns {ParametrizedViewFactory} An instance of the class "ParametrizedViewFactory" representing the view being used.
     */
    getView(){
        return this._viewFactory;
    }

    /**
     * Returns if hidden files should be displayed as well as normal ones.
     *
     * @returns {boolean} If hidden files should be displayed will be returned "true".
     */
    isShowHiddenFilesEnabled(){
        return this._showHiddenFiles === true;
    }

    /**
     * Returns if additional file information should be added or not.
     *
     * @returns {boolean} If additional file information is going to be added will be returned "true".
     */
    isShowFileInfoEnabled(){
        return this._showFileInfo === true;
    }

    /**
     * Returns the search query extracted from current request URL.
     *
     * @returns {?string} A string containing the search query found or null if no query has been found or if search is disabled.
     */
    getSearchQuery(){
        return this._searchQuery;
    }

    /**
     * Returns the virtual path extracted from current request URL.
     *
     * @returns {?string} A string containing the virtual path (not the path used to scan the real directory).
     */
    getAliasPath(){
        return this._aliasPath;
    }

    /**
     * Returns the number of the page currently being shown.
     *
     * @returns {?number} An integer number greater than zero representing the page number or null if paging is disabled.
     */
    getCurrentPage(){
        return this._currentPage;
    }

    /**
     * Returns an array containing all the numbers of the pages file list will be split into.
     *
     * @returns {?number[]} An array containing all the numbers or null if paging is disabled.
     */
    getPages(){
        return this._pages;
    }

    /**
     * Returns the name of the field that the list is currently ordered by.
     *
     * @returns {string} A string containing the name of the field.
     */
    getCurrentOrder(){
        return this._currentOrder;
    }

    /**
     * Returns the direction the list is currently ordered by.
     *
     * @returns {number} An integer number representing the direction, 1 for ascending order, -1 for descending one.
     */
    getCurrentOrderDirection(){
        return this._currentOrderDirection;
    }

    /**
     * Lists all the files contained in the given directory then returns an HTML view in order to display them.
     *
     * @param {string} path A string containing the path to the directory to list.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<View>} A view representing the HTML page used to display entries.
     *
     * @async
     */
    async index(path, request, response){
        this._initProperties(path, request);
        const files = await this._getFileList();
        let ret = null;
        if ( this._raw === true ){
            ret = files;
        }else if ( this._viewFactory !== null ) {
            // Generate an instance of the view from its factory object.
            ret = this._viewFactory.craft({
                files: files,
                directoryIndexer: this,
                makeQueryString: function(parameters){
                    return querystring.stringify(Object.assign({}, request.query, parameters));
                },
                makeLink: function(parameters){
                    return request.path + '?' + querystring.stringify(Object.assign({}, request.query, parameters));
                }
            }, new Context(request, response));
        }
        return ret;
    }
}

module.exports = DirectoryIndexer;
