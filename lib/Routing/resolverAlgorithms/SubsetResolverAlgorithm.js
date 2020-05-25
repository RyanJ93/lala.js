'use strict';

// Including Lala's modules.
const ResolverAlgorithm = require('./ResolverAlgorithm');
const ParameterizedRoute = require('../ParameterizedRoute');

/**
 * @typedef {Object} RouteComparisonResult An object used as a confirmation signal for caller method and containing regex matches used in route parameters processing.
 *
 * @property {boolean} found It indicates that a given path matches the client request URL, as invalid path causes null to be returned, this property is always true.
 * @property {string[]} matches An array of strings containing the matches found after executing the regular expression.
 */

/**
 * Implements a more efficient route resolution algorithm that look up routes by dividing them into concentric subsets according to some grouping criteria (method, path and then language).
 */
class SubsetResolverAlgorithm extends ResolverAlgorithm {
    /**
     * Returns a route matching on of the given languages.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {Map<?string, BaseRoute>} versions A map having as key the language code and as value the corresponding route, language code could be set to null if the corresponding route is suitable for any language.
     *
     * @returns {?BaseRoute} The route that best fits the given languages or null if no eligible route is found.
     *
     * @protected
     */
    static _pickRouteVersionByLanguage(request, versions){
        let version = undefined;
        if ( request.consideredLanguages instanceof Set ){
            // If a list of languages to check has been defined, then iterate the list looking for a valid localized version of the route.
            for ( const language of request.consideredLanguages ){
                version = versions.get(language);
                if ( typeof version !== 'undefined' ){
                    break;
                }
            }
        }else{
            // No languages list has been defined, get the route without a language defined.
            version = versions.get(null);
        }
        return typeof version === 'undefined' ? null : version;
    }

    /**
     * Checks if the given route path matches the client request url.
     *
     * @param {(string|RegExp)} path A string representing the route path, a RegExp object can be used as well.
     * @param {string} relativeURL A string representing the request url.
     *
     * @returns {?RouteComparisonResult} An object representing a confirmation that the given path matches the URL and containing regex matches used in parameters processing.
     *
     * @protected
     */
    static _compareRoute(path, relativeURL){
        let routeFound = null;
        if ( path === relativeURL || ( path === '/' && relativeURL === '' ) ){
            // The route doesn't contain any parameter.
            routeFound = {
                found: true,
                matches: null
            };
        }else if ( path instanceof RegExp ){
            // The route's path has been defined as a regex or the route contain at least one parameter.
            const matches = path.exec(relativeURL);
            if ( matches !== null ){
                routeFound = {
                    found: true,
                    matches: matches
                };
            }
        }
        return routeFound;
    }

    /**
     * Finds out the route that matches the most according to the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {Set<Router>} routers A set containing all the routers that should be considered during route resolution.
     *
     * @returns {?RouteResolutionResult} An object representing the URL found and its properties or null if no route matching current request URL has been found.
     */
    static resolve(request, routers){
        const url = SubsetResolverAlgorithm._getRequestURL(request);
        let routeFound = null;
        // Iterate each router defined, then iterate for each route found in each router.
        for ( const router of routers ) {
            // Get the prefix defined for this router and the "subtract" it to the original request URL.
            const prefix = router.getPrefix();
            const relativeURL = prefix === null ? url : url.substr(prefix.length);
            if ( request.method === 'GET' ){
                // Processing resource routes.
                const routes = router.getRouteStorage().getResourceRoutesFromIndex();
                if ( typeof routes !== 'undefined' ){
                    for ( const [path, versions] of routes ){
                        // If the request URL begins with this route path, then it references an assets mapped by this route.
                        if ( relativeURL === path || relativeURL.indexOf(path + '/') === 0 ){
                            // Check if more variants of this route ara available based on their languages and which one should be used.
                            const route = SubsetResolverAlgorithm._pickRouteVersionByLanguage(request, versions);
                            if ( route !== null ){
                                routeFound = {
                                    route: route,
                                    path: relativeURL.substr(route.getPath().length),
                                    router: router
                                };
                            }
                        }
                        if ( routeFound !== null ){
                            break;
                        }
                    }
                }
            }
            if ( routeFound === null ){
                // No route has been found so far, keep going on processing other routes, the ones who matches the request's HTTP method.
                let routes = router.getRouteStorage().getRegularRoutesFromIndex().get(request.method);
                if ( typeof routes !== 'undefined' ){
                    for ( const [path, versions] of routes ){
                        // Check if current route matches to request URL.
                        let result = SubsetResolverAlgorithm._compareRoute(path, relativeURL);
                        if ( result !== null ){
                            // Request URL matches, then pick the proper variant according to user defined language (if available).
                            const route = SubsetResolverAlgorithm._pickRouteVersionByLanguage(request, versions);
                            if ( route !== null ){
                                routeFound = {
                                    route: route,
                                    router: router,
                                    matches: result.matches,
                                    path: null
                                };
                                break;
                            }
                        }
                    }
                }
                if ( routeFound === null ){
                    // Still no route found, checking the ones declared to be available for any HTTP method.
                    routes = router.getRouteStorage().getRegularRoutesFromIndex().get('*');
                    if ( typeof routes !== 'undefined' ){
                        for ( const [path, versions] of routes ){
                            // Check if current route matches to request URL.
                            let result = SubsetResolverAlgorithm._compareRoute(path, relativeURL);
                            if ( result !== null ){
                                // Request URL matches, then pick the proper variant according to user defined language (if available).
                                const route = SubsetResolverAlgorithm._pickRouteVersionByLanguage(request, versions);
                                if ( route !== null ){
                                    routeFound = {
                                        route: route,
                                        router: router,
                                        matches: result.matches,
                                        path: null
                                    };
                                }
                            }
                        }
                        break;
                    }
                }else{
                    break;
                }
            }
        }
        if ( routeFound !== null ){
            // If a route has been found and if it supports URL parameters, then process them.
            routeFound.allowsParameters = routeFound.route instanceof ParameterizedRoute;
            routeFound.parameters = routeFound.allowsParameters ? {} : null;
            if ( routeFound.allowsParameters ){
                SubsetResolverAlgorithm._processRouteParameters(routeFound);
            }
            delete routeFound.matches;
        }
        return routeFound;
    }
}

module.exports = SubsetResolverAlgorithm;
