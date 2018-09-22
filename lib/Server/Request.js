'use strict';

const filesystem = require('fs');
const queryString = require('querystring');

class Request{
    /**
     * Parse the data contained in the request adding to it the GET and POST parameters.
     *
     * @param {object} request An object representing the request originated from the client.
     * @param {object} handler An object representing the request handler.
     * @param {object?} options An optional object containing the additional parameters and configuration.
     *
     * @return {Promise<any>}
     *
     * @static
     */
    static prepareRequest(request, handler, options){
        return new Promise((resolve, reject) => {
            // TODO: Add validations for "request" and "handler".
            if ( options === null || typeof options !== 'object' ){
                options = {};
            }
            if ( options.maxLength === null || isNaN(options.maxLength) ){
                options.maxLength = 2097152;
            }
            // Wrap the original request into a custom object containing some more information parsed from the request itself.
            let processedRequest = Object.assign({
                original: request,
                domain: request.domain,
                timeout: request.timeout,
                url: request.url,
                method: request.method,
                rawBody: '',
                cookies: {},
                sessions: {}
            }, Request._getRequestHelpers());
            // Processing GET parameters.
            let query = request.url.indexOf('?');
            if ( query !== -1 ){
                query = processedRequest.url.substr(query + 1);
                processedRequest.query = queryString.parse(query);
            }
            // Loading the request body and then parsing it in order to get POST parameters.
            request.on('data', (data) => {
                processedRequest.rawBody += data.toString();
                if ( Buffer.byteLength(processedRequest.rawBody) > options.maxLength ){
                    //
                    reject();
                }
            });
            request.on('end', () => {
                // Parse the loaded request body.
                processedRequest.params = queryString.parse(processedRequest.rawBody);
                processedRequest.headers = request.headers;
                processedRequest.rawHeaders = request.rawHeaders;
                processedRequest.trailers = request.trailers;
                processedRequest.rawTrailers = request.rawTrailers;
                processedRequest.upgrade = request.upgrade;
                resolve(processedRequest);
            });
            request.on('error', (error) => {
                //
                reject();
            });
        });
    }

    /**
     *
     *
     * @return {{}}
     *
     * @private
     */
    static _getRequestHelpers(){
        // TODO
        return {};
    }

    static prepareHandler(handler){
        handler.throwHTTPError = function(code){
            Request.throwHTTPError(code, this);
            return handler;
        };
        handler.setCookie = function(key, value, options){

        };
        return handler;
    }

    static test(){
        console.log(this);
    }

    static throwHTTPError(code, handler){
        switch ( code ){
            case 404:{
                handler.writeHead(404, 'Not found', {
                    'Content-Type': 'text/html'
                });
                if ( filesystem.existsSync('../resources/views/error.404.html') ){
                    try{
                        let content = filesystem.readFileSync('../resources/views/error.404.html').toString();
                        handler.write(content);
                    }catch(ex){console.log(ex);
                        handler.write('Not found.');
                    }finally{
                        handler.end();
                    }
                    return;
                }
                handler.write('Not found.');
                handler.end();
                return;
            }
        }
    }
}

module.exports = Request;
