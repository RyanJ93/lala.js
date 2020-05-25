'use strict';

// Including Lala's modules.
const ParametrizedViewFactory = require('./ParametrizedViewFactory');
const Engine = require('./engines/Engine');
const EjsEngine = require('./engines/EjsEngine');
const View = require('./View');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Allows to configure and generate views.
 */
class ViewFactory extends ParametrizedViewFactory {
    /**
     * The class constructor.
     *
     * @param {string} path A string containing the path to the file that implements the view layout.
     *
     * @throws {InvalidArgumentException} If an invalid path is given.
     */
    constructor(path) {
        super(path);

        /**
         * @type {Engine} _engine An instance of the class that implements the templating engine in use, it must extend the "Engine" class.
         *
         * @protected
         */
        this._engine = new EjsEngine();
    }

    /**
     * Sets the templating engine to use to generate the HTML code from the view, this method is chainable.
     *
     * @param {Engine} engine An instance of the class that implements the templating engine, it must extend the "Engine" class.
     *
     * @returns {ViewFactory}
     *
     * @throws {InvalidArgumentException} If an invalid templating engine instance is given.
     */
    setEngine(engine){
        if ( !( engine instanceof Engine ) ){
            throw new InvalidArgumentException('Invalid templating engine instance.', 1);
        }
        this._engine = engine;
        return this;
    }

    /**
     * Returns the templating engine to use to generate the HTML code from the view.
     *
     * @returns {Engine} An instance of the class that implements the templating engine that has been defined, by default "EjsEngine" is used.
     */
    getEngine(){
        return this._engine;
    }

    /**
     * Generates a new view based on the configuration defined.
     *
     * @param {?Object.<string, *>} [params] An object containing some parameters to pass to the templating engine or null if no parameter should be passed.
     * @param {?Context} [context] An instance of the class context containing the request and response objects obtained from a server.
     *
     * @returns {View} An instance of the class "View" representing the generated view.
     */
    craft(params = null, context = null){
        return new View(this, params, context);
    }
}

module.exports = ViewFactory;
