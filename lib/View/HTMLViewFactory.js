'use strict';

// Including Lala's modules.
const BaseViewFactory = require('./BaseViewFactory');
const HTMLView = require('./HTMLView');

/**
 * Allows to configure and generate views.
 */
class HTMLViewFactory extends BaseViewFactory {
    /**
     * Generates a new view based on the configuration defined.
     *
     * @returns {HTMLView} An instance of the class "HTMLView" representing the generated view.
     */
    craft(){
        return new HTMLView(this);
    }
}

module.exports = HTMLViewFactory;
