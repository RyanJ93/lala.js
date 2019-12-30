'use strict';

// Including Lala's modules.
const HelperRepository = require('../../Helpers/HelperRepository');
const { StreamedFileResponse, FileResponse, RedirectResponse } = require('../responses');

/**
 * Force the client to download a given file.
 *
 * @param {string} path A string containing the path to the file to download.
 * @param {?string} [filename] An optional string containing the name the downloaded file should be renamed to after being downloaded.
 *
 * @returns {FileResponse} An instance of the class "FileResponse" representing the download.
 */
function download(path, filename = null){
    return new FileResponse(path, filename, true);
}

/**
 * Streams a given file to the client.
 *
 * @param {string} path A string containing the path to the file to stream.
 * @param {?string} [filename] An optional string containing the name of the file.
 *
 * @returns {FileResponse} An instance of the class "StreamedFileResponse" representing the stream.
 */
function stream(path, filename = null){
    return new StreamedFileResponse(path, filename, true);
}

/**
 * Redirects the client to a given URL.
 * @param {string} url A string containing the URL the client should be redirected to.
 * @param {boolean} [permanent=false] If set to "true" will be returned HTTP code 301 meaning the redirect is meant to be permanent, otherwise 303.
 * @returns {RedirectResponse}
 */
function redirect(url, permanent = false){
    return new RedirectResponse(url, permanent);
}

module.exports.registerHelpers = () => {
    HelperRepository.register('download', download, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('stream', stream, 'com.lala.server.processor.HTTPRequestProcessor.response');
    HelperRepository.register('redirect', redirect, 'com.lala.server.processor.HTTPRequestProcessor.request');
};
