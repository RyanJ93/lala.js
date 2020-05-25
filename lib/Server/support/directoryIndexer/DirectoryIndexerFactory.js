'use strict';

// Including Lala's modules.
const BaseDirectoryIndexerFactory = require('./BaseDirectoryIndexerFactory');
const DirectoryIndexer = require('./DirectoryIndexer');
const ParametrizedViewFactory = require('../../../View/ParametrizedViewFactory');
const {
    InvalidArgumentException
} = require('../../../Exceptions');

/**
 * Allows to generates and configure instances of the "DirectoryIndexer" class.
 */
class DirectoryIndexerFactory extends BaseDirectoryIndexerFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = DirectoryIndexer.getDefaultConfiguration();
    }
    
    /**
     * Sets the order to apply by default to the file list, this method is chainable.
     *
     * @param {string} order A string containing the name of the order to apply, currently supported: name, size, last_modified_date, creation_date.
     * @param {number} [direction=1] An integer number representing the ordering direction, 1 for ascending order, -1 for descending one.
     *
     * @returns {DirectoryIndexerFactory}
     *
     * @throws {InvalidArgumentException} If an invalid or unsupported order is given.
     * @throws {InvalidArgumentException} If an invalid ordering direction is given.
     */
    setOrder(order, direction = 1){
        if ( typeof order !== 'string' || order === '' || !DirectoryIndexer.isSupportedOrder(order) ){
            throw new InvalidArgumentException('Invalid order.', 1);
        }
        if ( direction !== 1 && direction !== -1 ){
            throw new InvalidArgumentException('Invalid ordering direction.', 2);
        }
        this._properties.order = order;
        this._properties.orderDirection = direction;
        return this;
    }

    /**
     * Returns the name of the order that will be applied by default to the file list.
     *
     * @returns {string} A string containing the order name.
     */
    getOrder(){
        return this._properties.order;
    }

    /**
     * Returns the ordering direction that will be applied by default.
     *
     * @returns {number} An integer number representing the ordering direction, 1 for ascending order, -1 for descending one.
     */
    getOrderDirection(){
        return this._properties.orderDirection;
    }

    /**
     * Sets if file list can be ordered or not, this method is chainable.
     *
     * @param {boolean} ordering If set to "true" file list can be ordered by the user.
     *
     * @returns {DirectoryIndexerFactory}
     */
    setOrdering(ordering){
        this._properties.ordering = ordering !== false;
        return this;
    }

    /**
     * Returns if file list can be ordered by the user or not.
     *
     * @returns {boolean} If list ordering is allowed will be returned "true".
     */
    getOrdering(){
        return this._properties.ordering !== false;
    }

    /**
     * Sets if additional file information should be displayed alongside files name, this method is chainable.
     *
     * @param {boolean} showFileInfo If set to "true" additional information will be shown.
     *
     * @returns {DirectoryIndexerFactory}
     */
    setShowFileInfo(showFileInfo){
        this._properties.showFileInfo = showFileInfo !== false;
        return this;
    }

    /**
     * Returns if additional file information should be displayed or not.
     *
     * @returns {boolean} If additional information is going to be shown will be returned "true".
     */
    getShowFileInfo(){
        return this._properties.showFileInfo !== false;
    }

    /**
     * Sets if hidden files or files containing in a hidden parent directory (having "." as first char in their name) should be displayed, this method is chainable.
     *
     * @param {boolean} showHiddenFiles If set to "true" hidden files will be displayed as well as normal ones.
     *
     * @returns {DirectoryIndexerFactory}
     */
    setShowHiddenFiles(showHiddenFiles){
        this._properties.showHiddenFiles = showHiddenFiles === true;
        return this;
    }

    /**
     * Returns if hidden files should be displayed or not.
     *
     * @returns {boolean} If hidden files can be displayed will be returned "true".
     */
    getShowHiddenFiles(){
        return this._properties.showHiddenFiles === true;
    }

    /**
     * Sets if entries pagination is enabled or not, this method is chainable.
     *
     * @param {boolean} paging If set to "true" entries will be split into multiple pages.
     *
     * @returns {DirectoryIndexerFactory}
     */
    setPaging(paging){
        this._properties.paging = paging !== false;
        return this;
    }

    /**
     * Returns if entries pagination has been turned on.
     *
     * @returns {boolean} If pagination is enabled will be returned "true".
     */
    getPaging(){
        return this._properties.paging !== false;
    }

    /**
     * Sets the maximum amount of entries that can be contained in a single page, this method is chainable.
     *
     * @param {number} pageSize An integer number greater than zero representing the amount of entries allowed per page.
     *
     * @returns {DirectoryIndexerFactory}
     *
     * @throws {InvalidArgumentException} If an invalid entries count is given.
     */
    setPageSize(pageSize){
        if ( pageSize === null || isNaN(pageSize) || pageSize <= 0 ){
            throw new InvalidArgumentException('Invalid page size.', 1);
        }
        this._properties.pageSize = pageSize;
        return this;
    }

    /**
     * Returns the amount of entries that can be contained in a single page.
     *
     * @returns {number} An integer number greater than zero representing the amount of entries allowed per page.
     */
    getPageSize(){
        return this._properties.pageSize;
    }

    /**
     * Sets if entry search is enabled, this method is chainable.
     *
     * @param {boolean} search If set to "true" file search will be allowed.
     *
     * @returns {DirectoryIndexerFactory}
     */
    setSearch(search){
        this._properties.search = search !== false;
        return this;
    }

    /**
     * Returns if entry search has been enabled.
     *
     * @returns {boolean} If entry search has been turned on will be returned "true".
     */
    getSearch(){
        return this._properties.search !== false;
    }

    /**
     * Sets the page that will be used to display entries found, this method is chainable.
     *
     * @param {ParametrizedViewFactory} viewFactory An instance of the class "ParametrizedViewFactory" representing the factory used to generate the view to show, it must support parameters.
     *
     * @returns {DirectoryIndexerFactory}
     *
     * @throws {InvalidArgumentException} If an invalid view factory is given.
     */
    setViewFactory(viewFactory){
        if ( !( viewFactory instanceof ParametrizedViewFactory ) ){
            throw new InvalidArgumentException('Invalid view factory.', 1);
        }
        this._properties.viewFactory = viewFactory;
        return this;
    }

    /**
     * Returns the HTML view being used.
     *
     * @returns {ParametrizedViewFactory} An instance of the class "ParametrizedViewFactory" representing the factory used to generate the view to show.
     */
    getViewFactory(){
        return this._properties.viewFactory;
    }

    /**
     * Generates a new instance of the "DirectoryIndexer" class and then configure it according to the defined properties.
     *
     * @returns {DirectoryIndexer} The generated class instance.
     */
    craft(){
        return new DirectoryIndexer(this._properties);
    }
}

module.exports = DirectoryIndexerFactory;
