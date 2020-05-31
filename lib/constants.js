'use strict';

// Including native modules.
const filesystem = require('fs');

/**
 * @constant Contains current framework version number.
 *
 * @type {string}
 * @default
 */
Object.defineProperty(module.exports, 'VERSION', {
    value: '0.1.3',
    writable: false,
    enumerable: true,
    configurable: true
});

/**
 * @constant It's set to "true" if the application is running within a Docker based container.
 *
 * @type {boolean}
 * @default
 */
Object.defineProperty(module.exports, 'IS_INSIDE_DOCKER', {
    value: filesystem.existsSync('/.dockerenv'),
    writable: false,
    enumerable: true,
    configurable: true
});

/**
 * @constant It's set to "true" if the application is running on the Heroku platform.
 *
 * @type {boolean}
 * @default
 */
Object.defineProperty(module.exports, 'IS_ON_HEROKU', {
    value: filesystem.existsSync('/app/.heroku'),
    writable: false,
    enumerable: true,
    configurable: true
});
