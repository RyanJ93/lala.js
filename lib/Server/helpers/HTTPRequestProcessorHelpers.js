'use strict';

// Including Lala's modules.
const HelperRepository = require('../../Helpers/HelperRepository');
const { FileResponse, RedirectResponse } = require('../responses');
const { ViewFactory, HTMLViewFactory } = require('../../View');
const {
    InvalidArgumentException,
    NotAcceptableHTTPException,
    ForbiddenHTTPException,
    NotFoundHTTPException,
    BadRequestHTTPException,
    UnauthorizedHTTPException
} = require('../../Exceptions');

/**
 * @typedef {Object} HTTPRequestProcessorHelpersContext An object containing the context variables required by helper functions.
 *
 * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
 * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
 */

/**
 * Force the client to download a given file.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} path A string containing the path to the file to download.
 * @param {?string} [filename] An optional string containing the name the downloaded file should be renamed to after being downloaded.
 *
 * @returns {FileResponse} An instance of the class "FileResponse" representing the download.
 */
function download(context, path, filename = null){
    return new FileResponse(path, filename, true);
}

/**
 * Returns a view instance based on the given view file.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} path A string containing the path to the view file.
 * @param {?Object.<string, *>} [params] params Some optional parameters to pass to the view.
 *
 * @returns {View} An instance of the "View" representing the generated view.
 */
function view(context, path, params = null){
    const factory = new ViewFactory(path);
    return factory.craft(params);
}

/**
 * Returns a HTML view instance based on the given view file.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} path A string containing the path to the HTML file that implements the view.
 *
 * @returns {HTMLView} An instance of the "HTMLView" representing the generated view.
 */
function staticView(context, path){
    const factory = new HTMLViewFactory(path);
    return factory.craft();
}

/**
 * Redirects the client to a given URL.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} url A string containing the URL the client should be redirected to.
 * @param {boolean} [permanent=false] If set to "true" will be returned HTTP code 301 meaning the redirect is meant to be permanent, otherwise 303.
 * @param {boolean} [preserve=false] If set to "true" request body and method will be preserve by sending 307/308 status code instead of 301/303.
 *
 * @returns {RedirectResponse}
 */
function redirect(context, url, permanent = false, preserve = false){
    return new RedirectResponse(url, permanent, preserve);
}

/**
 * Checks if the given resource attributes meets the constraints sent by the client.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {?string} eTag A string containing the eTag assigned to the resource.
 * @param {?Date} lastModifiedDate An instance of the "Date" class representing the resource last modified date.
 * @param {?string[]} [vary] An array of strings containing a list of headers.
 *
 * @returns {boolean} Returns "true" if given properties matches the the constraints sent by the client the resource shouldn't be sent as an up-to-date copy is already owned by the client side.
 *
 * @throws {InvalidArgumentException} If an invalid eTag is given.
 * @throws {InvalidArgumentException} If an invalid last modified date object is given.
 * @throws {InvalidArgumentException} If an invalid headers list is given.
 */
function matchConditionals(context, eTag, lastModifiedDate, vary = null){
    if ( eTag !== null && ( eTag === '' || typeof eTag !== 'string' ) ){
        throw new InvalidArgumentException('Invalid eTag.', 1);
    }
    if ( lastModifiedDate !== null && !( lastModifiedDate instanceof Date ) ){
        throw new InvalidArgumentException('Invalid last modified date.', 2);
    }
    if ( vary !== null && !Array.isArray(vary) ){
        throw new InvalidArgumentException('Invalid headers list.', 3);
    }
    let match = false;
    if ( context.request.ignoreConditionalsHeaders !== true && typeof context.request.conditionals === 'object' ){
        if ( eTag !== '' && typeof eTag === 'string' ){
            // An eTag has been passed, check it according to the contents of the "If-Match" and the "If-None-Match" HTTP headers.
            if ( context.request.conditionals.matchAnyETag === true || context.request.conditionals.matchETags.indexOf(eTag) !== -1 ){
                match = true;
            }
            if ( context.request.conditionals.mismatchAnyETag === true ){
                match = true;
            }
            if ( context.request.conditionals.mismatchETags.length > 0 && context.request.conditionals.mismatchETags.indexOf(eTag) === -1 ){
                match = true;
            }
        }
        if ( match && lastModifiedDate instanceof Date ){
            // The resource last modified date has been passed, check it according to the "If-Modified-Since" and the "If-Unmodified-Since" HTTP headers.
            if ( context.request.conditionals.modifiedSince < lastModifiedDate || context.request.conditionals.unmodifiedSince > lastModifiedDate ){
                match = true;
            }
        }
        if ( match && context.request.conditionals.varyAny !== true && vary !== null ){
            // A list of headers has been passed, check it according to the "Vary" HTTP header.
            let i = 0, length = vary.length;
            while ( !match && i < length ){
                if ( context.request.conditionals.vary.indexOf(vary[i].toLowerCase()) === -1 ){
                    match = true;
                }
                i++;
            }
        }
    }
    return match;
}

/**
 * Notifies to the client that the request resource has not changed and then it shouldn't be sent.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 */
function unchanged(context){
    context.response.statusCode = 304;
    context.response.statusMessage = 'Not Modified';
    context.response.rawOutput = null;
    context.response.overrideStatusMessage = true;
}

/**
 * Prevents conditional headers to be interpreted in order to check if client owns a specific version of the requested resource.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 */
function ignoreConditionalsHeaders(context){
    context.request.ignoreConditionalsHeaders = true;
}

/**
 * Checks if a given MIME type is an accepted response according to client indications.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} MIMEType A string containing the MIME type to check.
 *
 * @returns {boolean} If the given MIME type is accepted will be returned "true".
 *
 * @throws {InvalidArgumentException} If an invalid MIME type is given.
 */
function isMIMETypeAccepted(context, MIMEType){
    if ( MIMEType === '' || typeof MIMEType !== 'string' ){
        throw new InvalidArgumentException('Invalid MIME type.', 1);
    }
    // Check if any MIME type is accepted.
    let accepted = typeof context.request.accept['*/*'] === 'number';
    if ( !accepted ){
        // Check if a wildcard can be used.
        const firstPart = MIMEType.substr(0, MIMEType.indexOf('/'));
        accepted = typeof context.request.accept[firstPart + '/*'] === 'number';
        if ( !accepted ){
            // Check is the full MIME type is accepted.
            accepted = typeof context.request.accept[MIMEType] === 'number';
        }
    }
    return accepted;
}

/**
 * Returns the score associated to a given MIME type according to client indications.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string} MIMEType A string containing the MIME type to check.
 *
 * @returns {number} A floating point number greater or equal than zero representing the score found or 0 if the given MIME type is not accepted.
 *
 * @throws {InvalidArgumentException} If an invalid MIME type is given.
 */
function getMIMETypeAcceptScore(context, MIMEType){
    if ( MIMEType === '' || typeof MIMEType !== 'string' ){
        throw new InvalidArgumentException('Invalid MIME type.', 1);
    }
    let score = context.request.accept[MIMEType];
    if ( isNaN(score) ){
        const firstPart = MIMEType.substr(0, MIMEType.indexOf('/'));
        score = context.request.accept[firstPart + '/*'];
        if ( isNaN(score) ){
            score = context.request.accept['*/*'];
        }
    }
    return isNaN(score) ? 0 : score;
}

/**
 * determines which MIME type is accepted according to client indications, the one having the highest score is returned.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {string[]} MIMETypes An array of strings containing the MIME types to checks.
 *
 * @returns {?string} A string representing the MIME type that matches the most or null if none is found.
 *
 * @throws {InvalidArgumentException} If an invalid MIME types array is given.
 */
function whichAcceptedMIMEType(context, MIMETypes){
    if ( !Array.isArray(MIMETypes) ){
        throw new InvalidArgumentException('Invalid MIME types array.', 1);
    }
    let maxScore = 0, preferredMIMEType = null;
    const length = MIMETypes.length;
    for ( let i = 0 ; i < length ; i++ ){
        // Get the score of current MIME type in order to check if it is the one who it's the best choice.
        const score = getMIMETypeAcceptScore(context, MIMETypes[i]);
        if ( score > maxScore ){
            // If its score is higher than the last one found, then it's a better candidate to return.
            maxScore = score;
            preferredMIMEType = MIMETypes[i];
        }
    }
    return preferredMIMEType;
}

/**
 * Returns the error number 406 to the client then stops the request processing.
 *
 * @throws {NotAcceptableHTTPException} The exception to throw in order to notify the client about the error.
 */
function notAcceptable(){
    throw new NotAcceptableHTTPException('Request manually denied.', 1);
}

/**
 * Returns the error number 404 to the client then stops the request processing.
 *
 * @throws {NotAcceptableHTTPException} The exception to throw in order to notify the client about the error.
 */
function notFound(){
    throw new NotFoundHTTPException('Request manually denied.', 1);
}

/**
 * Returns the error number 403 to the client then stops the request processing.
 *
 * @throws {NotAcceptableHTTPException} The exception to throw in order to notify the client about the error.
 */
function forbidden(){
    throw new ForbiddenHTTPException('Request manually denied.', 1);
}

/**
 * Returns the error number 400 to the client then stops the request processing.
 *
 * @throws {NotAcceptableHTTPException} The exception to throw in order to notify the client about the error.
 */
function badRequest(){
    throw new BadRequestHTTPException('Request manually denied.', 1);
}

/**
 * Returns the error number 401 to the client then stops the request processing.
 *
 * @throws {NotAcceptableHTTPException} The exception to throw in order to notify the client about the error.
 */
function unauthorized(){
    throw new UnauthorizedHTTPException('Request manually denied.', 1);
}

/**
 * Signals the client to clear browsing data.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 * @param {boolean} [cache=true] If set to "true" the client side will be informed that website cache should be wiped out.
 * @param {boolean} [cookies=false] If set to "true" the client side will be informed that cookies associated to this website should be removed.
 * @param {boolean} [storage=false] If set to "true" the client side will be informed that all DOM storage should be removed.
 * @param {boolean} [executionContexts=false] If set to "true" the client side will be informed that all browsing contexts should be reloaded.
 */
function clearSiteData(context, cache = true, cookies = false, storage = false, executionContexts = false){
    const directives = [];
    if ( cache === true ){
        directives.push('"cache"');
    }
    if ( cookies === true ){
        directives.push('"cookies"');
    }
    if ( storage === true ){
        directives.push('"storage"');
    }
    if ( executionContexts === true ){
        directives.push('"executionContexts"');
    }
    if ( directives.length > 0 ){
        context.response.setHeader('Clear-Site-Data', directives.join(', '));
    }
}

/**
 * Signals the client to clear all browsing data, including cache, cookies and DOM storage.
 *
 * @param {HTTPRequestProcessorHelpersContext} context An object containing all the variables needed by this function to work within the invoking context.
 */
function clearAllSiteData(context){
    context.response.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
}

module.exports.registerHelpers = () => {
    HelperRepository.register('download', download, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('view', view, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('staticView', staticView, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('redirect', redirect, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('unchanged', unchanged, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('matchConditionals', matchConditionals, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('ignoreConditionalsHeaders', ignoreConditionalsHeaders, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('isMIMETypeAccepted', isMIMETypeAccepted, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('getMIMETypeAcceptScore', getMIMETypeAcceptScore, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('whichAcceptedMIMEType', whichAcceptedMIMEType, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('notAcceptable', notAcceptable, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('notFound', notFound, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('forbidden', forbidden, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('badRequest', badRequest, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('unauthorized', unauthorized, 'com.lala.server.processor.HTTPRequestProcessor.request');
    HelperRepository.register('clearSiteData', clearSiteData, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('clearAllSiteData', clearAllSiteData, 'com.lala.server.processor.HTTPRequestProcessor.response');
};
