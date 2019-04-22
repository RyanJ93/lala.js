'use strict';

// Including native modules.
const filesystem = require('fs');
const queryString = require('querystring');

// Including Lala's modules.
const Mimetype = require('../Support/Mimetype');
const View = require('../View/View');
const { VERSION } = require('../../index');
const {
    InvalidHTTPRequestException,
    InvalidArgumentException
} = require('../Exceptions');

class Request {
    /**
     *
     *
     * @return {{}}
     *
     * @private
     */
    static _addRequestHelpers(request){
        // TODO: Add helper functions to the request object.
        return {};
    }

    /**
     * Parse the data contained in the request adding to it the GET and POST parameters.
     *
     * @param {object} request An object representing the client request and containing all the connection properties.
     * @param {object} response An object representing the response that will be sent back to the client.
     * @param {object} [options] An optional object containing the additional parameters and configuration.
     *
     * @return {Promise<void>}
     *
     * @async
     */
    static async prepareRequest(request, response, options){
        if ( options || typeof options !== 'object' ){
            options = {};
        }
        const maxLength = options.maxLength !== null && !isNaN(options.maxLength) && options.maxLength > 0 ? options.maxLength : 2097152;
        this._addRequestHelpers(request);
        // Processing GET parameters.
        const queryIndex = request.url.indexOf('?');
        request.query = queryIndex === -1 ? {} : queryString.parse(request.url.substr(queryIndex + 1));
        // Extract user credentials used in HTTP authentication.
        Request.addCredentialsFromRequest(request);
        request.user = request.authenticator = request.userSession = null;
        // Get user languages and their priority.
        request.languages = Request.parseAcceptLanguage(request.headers['accept-language']);
        if ( typeof request.on === 'function' && request.method === 'POST' || request.method === 'PATCH' ){
            // Load the full request body.
            request.rawBody = await (new Promise((resolve, reject) => {
                let rawBody = '';
                request.on('data', (data) => {
                    rawBody += data.toString();
                    if ( Buffer.byteLength(rawBody) > maxLength ){
                        // Request body size has exceeded the maximum allowed size.
                        reject(new InvalidHTTPRequestException('The request\'s body is too long.', 1));
                        //request.connection.destroy();
                    }
                });
                request.on('end', () => {
                    resolve(rawBody);
                });
                request.on('error', (error) => {
                    console.log(error);
                    //
                    reject();
                });
            }));
            // Parse the request body.
            request.params = queryString.parse(request.rawBody);
        }
        request.processedByLala = true;
        response.setHeader('X-Powered-By', 'Lala.js');
    }

    static prepareResponse(response){
        response.throwHTTPError = (code) => {
            Request.throwHTTPError(code, this);
            return handler;
        };
        response.download = (path) => {
            return Request._serveFile(response, path);
        };
        response.json = (data) => {

        };
        response.redirect = (url, permanent = false) => {
            Request._redirect(response, url, permanent);
        };
        response.render = (path, data) => {
            return Request._render(response, path, data);
        };
        response.sendStatus = (code, message) => {

        };
        response.setCookie = (key, value, options) => {

        };
        response.throwStandardError = (HTTPCode, message, attributes) => {
            this._throwStandardError(HTTPCode, message, response, attributes);
        };
        response.serveFile = (path) => {
             return this._serveFile(response, path);
        };
        response.processedByLala = true;
    }

    /**
     *
     *
     * @param response
     * @param url
     * @param permanent
     *
     * @private
     */
    static _redirect(response, url, permanent = false){
        if ( url === '' || typeof url !== 'string' ){
            throw new InvalidArgumentException('Invalid url.', 1);
        }
        if ( !response.headersSent && !response.finished ){
            const code = permanent === true ? 301 : 302;
            // Set redirection HTTP header and then close current connection.
            response.writeHead(code, {
                Location: url
            });
            response.end();
        }
    }

    /**
     *
     *
     * @param response
     * @param path
     * @param data
     *
     * @returns {Promise<void>}
     *
     * @private
     */
    static async _render(response, path, data){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        const view = new View(path, data);
        await view.render();
    }

    /**
     * Sends a given file to the client.
     *
     * @param response
     * @param {string} path A string containing the path to the file to send.
     *
     * @returns {Promise<void>}
     *
     * @private
     */
    static async _serveFile(response, path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        try{
            // Read file properties.
            const stat = filesystem.statSync(path);
            // Open a read stream to the file used to send it to the connected client.
            const stream = filesystem.createReadStream(path);
            // Write basic required HTTP headers.
            const mime = Mimetype.detect(path);
            response.writeHead(200, {
                'Content-Type': ( mime !== null ? mime : 'application/octet-stream' ),
                'Content-Length': stat.size
            });
            // Send the file to the connected client as a stream.
            stream.pipe(response);
        }catch(ex){console.log(ex);
            //
        }
    }

    static _throwStandardError(HTTPCode, message, response, attributes){
        if ( attributes === null || typeof attributes !== 'object' ){
            attributes = {};
        }
        const textMessage = typeof attributes.message !== 'string' ? message : attributes.message;
        const subMessage = typeof attributes.subMessage !== 'string' ? '' : attributes.subMessage;
        let page = null;
        try{
            page = filesystem.readFileSync(__dirname + '/../../resources/views/HTTPError.html');
            page = page.toString();
            page = page.replace(/\{\{code\}\}/g, HTTPCode);
            page = page.replace(/\{\{message\}\}/g, textMessage);
            page = page.replace(/\{\{sub_message\}\}/g, subMessage);
        }catch(ex){console.log(ex);
            page = '<html lang="en"><head><title>' + message + '</title></head><body style="text-align:center;"><h1>' + HTTPCode + ' ' + message + '</h1><hr /><p>Lala.js / ' + VERSION + '</p></body>';
        }
        response.writeHead(HTTPCode);
        response.write(page);
        response.end();
    }

    static throwHTTPError(code, handler){
        // DEPRECATED
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

    /**
     *
     *
     * @param request
     */
    static addCredentialsFromRequest(request){
        if ( request === null || typeof request !== 'object' || request.headers === null || typeof request.headers !== 'object' ){
            throw new InvalidArgumentException('Invalid request object.', 1);
        }
        //TODO: Add support for credential sent over URL.
        request.credentials = null;
        request.authMethod = null;
        if ( request.headers.authorization !== '' && typeof request.headers.authorization === 'string' ){
            // Separate credentials from the authentication method.
            const components = request.headers.authorization.split(' ', 2);
            if ( components.length === 2 ){
                request.authMethod = components[0].toLowerCase();
                if ( request.authMethod === 'basic' ){
                    // Decode user credentials used in basic HTTP authentication mechanism.
                    const credentials = Buffer.from(components[1], 'base64').toString().split(':');
                    if ( credentials.length === 2 ){
                        request.credentials = {
                            username: credentials[0],
                            password: credentials[1]
                        };
                    }
                }
            }
        }
    }

    static parseAcceptLanguage(acceptLanguage){
        let languages = {};
        if ( acceptLanguage !== '' && typeof acceptLanguage === 'string' ){
            const blocks = acceptLanguage.split(',');
            const length = blocks.length;
            for ( let i = 0 ; i < length ; i++ ){
                const block = blocks[i].split(';');
                if ( block.length === 1 ){
                    languages[block[0]] = 1;
                    continue;
                }
                if ( block[1].indexOf('q=') === 0 ){
                    const priority = parseFloat(block[1].substr(2));
                    if ( !isNaN(priority) ){
                        languages[block[0]] = priority;
                    }
                }
            }
            return languages;
        }
    }
}

module.exports = Request;
