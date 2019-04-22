'use strict';

// Including Lala's modules.
const BaseRoute = require('./BaseRoute');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 *
 */
class RedirectRoute extends BaseRoute {
    constructor(path, target){
        super();

        this._target = null;
    }
}

module.exports = RedirectRoute;