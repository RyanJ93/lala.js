'use strict';

// Including Lala's modules.
const HeaderManager = require('./HeaderManager');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Allows to manage the Content Security Policy (CSP) related HTTP headers.
 */
class CSPHeaderManager extends HeaderManager {
    /**
     * The class constructor.
     */
    constructor() {
        super();

        /**
         * @type {Object.<string, string[]>} _directives An object containing the directives to declare to the client side.
         *
         * @protected
         */
        this._directives = Object.create(null);

        /**
         * @type {?string} [_reportURI] A string containing the URL where policy violations should be reported at.
         *
         * @protected
         */
        this._reportURI = null;
    }

    /**
     * Sets a CSP directive, this method is chainable.
     *
     * @param {string} name A string representing the directive name, one of the built-in constant should be used.
     * @param {string[]} params An array of strings containing the directive values.
     * @param {boolean} [overwrite=false] If set to "true" any older params associated to the given directive will be replaced.
     *
     * @returns {CSPHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid directive name is given.
     * @throws {InvalidArgumentException} If an invalid array of parameters is given.
     * @throws {InvalidArgumentException} If some parameter has already been defined for the given directive and the "overwrite" option is turned off.
     */
    setDirective(name, params, overwrite = false){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid directive name.', 1);
        }
        if ( !Array.isArray(params) ){
            throw new InvalidArgumentException('Invalid directive params.', 2);
        }
        if ( typeof this._directives[name] !== 'undefined' && overwrite !== true ){
            throw new InvalidArgumentException('Directive already defined.', 3);
        }
        this._directives[name] = [];
        const length = params.length;
        // Ensure every value to be correctly wrapped into single quotes.
        for ( let i = 0 ; i < length ; i++ ){
            if ( params[i] !== '' && typeof params[i] === 'string' ){
                if ( params[i].charAt(0) === '\'' && params[i].charAt(params[i].length - 1) === '\'' ){
                    this._directives[name].push(params[i]);
                }else{
                    this._directives[name].push('\'' + params[i] + '\'');
                }
            }
        }
        return this;
    }

    /**
     * Removes all the parameters associated to a given CSP directive, this method is chainable.
     *
     * @param {string} name A string representing the name of the CSP directive to remove.
     *
     * @returns {CSPHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid directive name is given.
     */
    removeDirective(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid directive name.', 1);
        }
        delete this._directives[name];
        return this;
    }

    /**
     * Removes all the parameters associated to all the directives, this method is chainable.
     *
     * @returns {CSPHeaderManager}
     */
    dropDirectives(){
        this._directives = Object.create(null);
        return this;
    }

    /**
     * Returns all the parameters associated to a given CSP directive.
     *
     * @param {string} name A string representing the name of the CSP directive.
     *
     * @returns {?string[]} An array of strings containing the directive values or null if no value has been defined for such directive.
     */
    getDirective(name){
        if ( name === '' || typeof name !== 'string' ){
            throw new InvalidArgumentException('Invalid directive name.', 1);
        }
        return typeof this._directives[name] === 'undefined' ? null : this._directives[name];
    }

    /**
     * Sets the URL where CSP policy violations should be reported at, this method is chainable.
     *
     * @param {string} uri A string containing the URL or null if none should be declared.
     *
     * @returns {CSPHeaderManager}
     *
     * @throws {InvalidArgumentException} If an invalid URL is given.
     */
    setReportURI(uri){
        if ( uri !== null && ( uri === '' || typeof uri !== 'string' ) ){
            throw new InvalidArgumentException('Invalid report URI.', 1);
        }
        this._reportURI = uri;
        return this;
    }

    /**
     * Returns the URL there CSP policy violations should be reported at.
     *
     * @returns {?string} A string representing the URL or null if none has been defined.
     */
    getReportURI(){
        return this._reportURI;
    }

    /**
     * Generates the HTTP headers to include in the client response.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Object.<string, (string|string[])>} An object having as key the header name and as value one or multiple values (represented as an array).
     */
    buildHeaders(request, response){
        let header = '';
        for ( const directive in this._directives ){
            header += directive + ' ' + this._directives[directive].join(' ') + '; ';
        }
        header = header.substr(0, header.length - 2);
        if ( this._reportURI !== null ){
            header += '; report-uri ' + this._reportURI;
        }
        return header === '' ? null : {
            ['Content-Security-Policy']: header
        };
    }
}

/**
 * @constant The default directive used to define the default policy for fetching resources such as JavaScript, Images, CSS, Fonts, AJAX requests, Frames, HTML5 Media.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'DEFAULT_SRC', {
    value: 'default-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for JavaScript sources.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'SCRIPT_SRC', {
    value: 'script-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for CSS sources.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'STYLE_SRC', {
    value: 'style-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for images sources.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'IMG_SRC', {
    value: 'img-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for XHR requests (including XMLHttpRequest (AJAX), WebSocket, fetch(), <a ping> or EventSource).
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'CONNECT_SRC', {
    value: 'connect-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for fonts sources.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'FONT_SRC', {
    value: 'font-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for plugins sources (for instance <object>, <embed> or <applet>).
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'OBJECT_SRC', {
    value: 'object-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for multimedia sources (for instance <audio> or <video>).
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'MEDIA_SRC', {
    value: 'media-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for frames sources.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'FRAME_SRC', {
    value: 'frame-src',
    writable: false
});

/**
 * @constant The directive used to enable a sandbox for the requested resource similar to the iframe sandbox attribute.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'SANDBOX', {
    value: 'sandbox',
    writable: false
});

/**
 * @constant The directive used to define the policy for web workers and nested browsing contexts (such as <frame> and <iframe>).
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'CHILD_SRC', {
    value: 'child-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for forms.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'FORM_SRC', {
    value: 'form-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for embedding the resource using <frame> <iframe> <object> <embed> <applet>.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'FRAME_ANCESTORS', {
    value: 'frame-ancestors',
    writable: false
});

/**
 * @constant The directive used to define valid MIME types for plugins invoked via <object> and <embed>.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'PLUGIN_TYPES', {
    value: 'plugin-types',
    writable: false
});

/**
 * @constant The directive used to define a set of allowed URLs which can be used in the src attribute of a HTML base tag.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'BASE_URI', {
    value: 'base-uri',
    writable: false
});

/**
 * @constant The directive used to restrict the URLs which may be loaded as a Worker, SharedWorker or ServiceWorker.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'WORKER_SRC', {
    value: 'worker-src',
    writable: false
});

/**
 * @constant The directive used to restrict the URLs that application manifests can be loaded.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'MANIFEST_SRC', {
    value: 'manifest-src',
    writable: false
});

/**
 * @constant The directive used to define the policy for request prefetch and prerendering.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'PREFETCH_SRC', {
    value: 'prefetch-src',
    writable: false
});

/**
 * @constant The directive used to restrict the URLs that the document may navigate to by any means.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(CSPHeaderManager, 'NAVIGATE_TO', {
    value: 'navigate-to',
    writable: false
});

module.exports = CSPHeaderManager;
