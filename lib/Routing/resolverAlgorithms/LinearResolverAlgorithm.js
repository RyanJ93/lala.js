'use strict';

// Including Lala's modules.
const ResolverAlgorithm = require('./ResolverAlgorithm');
const ResourceRoute = require('../ResourceRoute');
const ParameterizedRoute = require('../ParameterizedRoute');

/**
 * Implements the simplest route resolution algorithm, it may perform better than the "subset" algorithm when working with a little set of simple routes, however, the "subset" algorithm is usually advised.
 */
class LinearResolverAlgorithm extends ResolverAlgorithm {
    /**
     * Finds out the route that matches the most according to the given client request.
     *
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {Set<Router>} routers A set containing all the routers that should be considered during route resolution.
     *
     * @returns {?RouteResolutionResult} An object representing the URL found and its properties or null if no route matching current request URL has been found.
     */
    static resolve(request, routers){
        const languages = request.hasOwnProperty('consideredLanguages') && request.consideredLanguages instanceof Set ? request.consideredLanguages : new Set([null]);
        const url = LinearResolverAlgorithm._getRequestURL(request);
        const routerData = [], variants = new Map();
        // Resource routes require the HTTP request to be done using the GET method.
        let length = 0, routeFound = null;
        for ( const router of routers ){
            // Prepare all the routes registered within current router and the prefix that has been defined for current router, they will be reused in next stage.
            routerData[length] = {
                routes: router.getRoutesSet(),
                prefix: router.getPrefix(),
                router: router
            };
            if ( typeof routerData[length].prefix !== 'string' || url.indexOf(routerData[length].prefix) === 0 ){
                // Remove the prefix defined from the original URL, if present.
                routerData[length].relativeURL = typeof routerData[length].prefix === 'string' ? url.substr(routerData[length].prefix.length) : url;
                if ( request.method === 'GET' ){
                    for ( const route of routerData[length].routes ){
                        if ( route instanceof ResourceRoute ){
                            // Process only the resource routes in current stage.
                            if ( routerData[length].relativeURL.indexOf(route.getPath()) === 0 ){
                                const language = route.getLanguage();
                                // Check if current route's language is accepted according to the client.
                                if ( languages.has(language) ){
                                    // Resource routes require the URL to start by the route path, then, the remaining part, defines the path to the requested file.
                                    const base = route.getPath();
                                    const pathFound = routerData[length].relativeURL.substr(base.length);
                                    // Add this result to the list of all the eligible options indexing it by language.
                                    variants.set(language, {
                                        route: routeFound,
                                        router: router,
                                        path: pathFound
                                    });
                                }
                            }
                        }
                    }
                }
            }
            length++;
        }
        if ( variants.size === 0 ){
            for ( let i = 0 ; i < length ; i++ ){
                if ( typeof routerData[i].prefix !== 'string' || url.indexOf(routerData[i].prefix) === 0 ){
                    for ( const route of routerData[i].routes ){
                        if ( !( route instanceof ResourceRoute ) ){
                            // Process all the other routes.
                            const routeMethod = route.getMethod();
                            if ( routeMethod === request.method || ( routeMethod === '*' && routeBuffer === null ) ){
                                const language = route.getLanguage();
                                if ( languages.has(language) ){
                                    const path = route.getPath();
                                    const isRegex = route.isRegex();
                                    const internalRegex = route.getRegex();
                                    if ( routeMethod === request.method ){
                                        // This route matches the request method, so
                                        if ( !isRegex && internalRegex === null ){
                                            if ( routerData[i].relativeURL === path ){
                                                variants.set(language, {
                                                    route: route,
                                                    router: routerData[i].router
                                                });
                                            }
                                            continue;
                                        }
                                        const matches = ( internalRegex === null ? path : internalRegex ).exec(routerData[i].relativeURL);
                                        if ( matches !== null ){
                                            variants.set(language, {
                                                route: route,
                                                router: routerData[i].router,
                                                matches: matches
                                            });
                                        }
                                        continue;
                                    }
                                    if ( !isRegex && internalRegex === null ){
                                        if ( routerData[i].relativeURL === path ){
                                            variants.set(language, {
                                                route: route,
                                                router: routerData[i].router
                                            });
                                        }
                                        continue;
                                    }
                                    const matches = ( internalRegex === null ? path : internalRegex ).exec(routerData[i].relativeURL);
                                    if ( matches !== null ){
                                        variants.set(language, {
                                            route: route,
                                            router: routerData[i].router,
                                            matches: matches
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if ( variants.size !== 0 ){
            for ( const language of languages ){
                const variant = variants.get(language);
                if ( typeof variant !== 'undefined' ){
                    routeFound = variant;
                    break;
                }
            }
            if ( routeFound === null && variants.has(null) ){
                routeFound = variants.get(null);
            }
            if ( routeFound !== null ){
                // If a route has been found and if it supports URL parameters, then process them.
                routeFound.allowsParameters = routeFound.route instanceof ParameterizedRoute;
                routeFound.parameters = routeFound.allowsParameters ? {} : null;
                if ( routeFound.allowsParameters ){
                    LinearResolverAlgorithm._processRouteParameters(routeFound);
                }
                delete routeFound.matches;
            }

        }
        return routeFound;
    }
}

module.exports = LinearResolverAlgorithm;
