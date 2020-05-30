'use strict';

// Including Lala's modules.
const PresentersRepository = require('../../View/PresentersRepository');
const RouteRepository = require('../RouteRepository');
const ParametrizedRoute = require('../ParameterizedRoute');
const ResourceRoute = require('../ResourceRoute');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 * Returns the URL to a route according to the given route name.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 * @param {string} name A string containing the unique name assigned to the registered route.
 * @param {?Object.<string, string>} [routeParameters] An object having as key the parameter name and as value the value to replace in compiled path (if required by the route).
 *
 * @returns {string} A string containing the URL to the route or an empty string if no route matching the given name has been found.
 *
 * @throws {InvalidArgumentException} If an invalid route name is given.
 * @throws {InvalidArgumentException} If an invalid object is given as route parameters.
 */
function route(parameters, name, routeParameters = null){
    if ( name === '' || typeof name !== 'string' ){
        throw new InvalidArgumentException('Invalid route name.', 1);
    }
    if ( typeof routeParameters !== 'object' ){
        throw new InvalidArgumentException('Invalid route parameters.', 2);
    }
    const route = RouteRepository.get(name);
    return route === null ? '' : ( route instanceof ParametrizedRoute ? route.compile(routeParameters) : route.compile() );
}

/**
 * Returns the URL to a file according to the given resource route name and file path.
 *
 * @param {Object.<string, *>} parameters An object containing all the parameters that have been passed to the view the presenter has been invoked from.
 * @param {string} name A string containing the unique name assigned to the registered route.
 * @param {string} path A string containing the path to the file.
 *
 * @returns {string} A string containing the URL to the file or an empty string if no route matching the given name has been found.
 *
 * @throws {InvalidArgumentException} If an invalid route name is given.
 * @throws {InvalidArgumentException} If an invalid file path is given.
 */
function asset(parameters, name, path){
    if ( name === '' || typeof name !== 'string' ){
        throw new InvalidArgumentException('Invalid route name.', 1);
    }
    if ( path === '' || typeof path !== 'string' ){
        throw new InvalidArgumentException('Invalid file path.', 2);
    }
    const route = RouteRepository.get(name);
    return route instanceof ResourceRoute ? route.compile(path) : '';
}

module.exports.registerPresenters = () => {
    PresentersRepository.register('route', route);
    PresentersRepository.register('asset', asset);
};
