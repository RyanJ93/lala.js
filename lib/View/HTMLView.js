'use strict';

// Including native modules.
const { Readable } = require('stream');

// Including Lala's modules.
const BaseView = require('./BaseView');
const SourceRepository = require('./SourceRepository');

/**
 * Represents a plain HTML view.
 */
class HTMLView extends BaseView {
    /**
     * The class constructor.
     *
     * @param {HTMLViewFactory} factory An instance of the class "HTMLViewFactory" representing the factory where this class instance has been generated from.
     *
     * @throws {InvalidArgumentException} If an invalid factory class instance is given.
     */
    constructor(factory){
        super(factory);
    }

    /**
     * Returns the contents of the HTML file defined as a readable stream.
     *
     * @returns {Promise<?module:stream.internal.Readable>} A readable stream that returns the HTML code produced from the view.
     *
     * @async
     */
    async renderAsStream(){
        // Generate the stream object.
        const stream = new Readable();
        // Get the file contents and add them to the generated stream.
        stream.push(await this.renderAsString());
        // Close the stream.
        stream.push(null);
        return stream;
    }

    /**
     * Returns the contents of the HTML file defined as a plain string.
     *
     * @returns {Promise<string>} A string containing the HTML code generated from the view.
     *
     * @async
     */
    async renderAsString(){
        return SourceRepository.fetchSync(this._factory.getPath());
    }
}

module.exports = HTMLView;
