'use strict';

const http = require('http');
const crypto = require('crypto');
const filesystem = require('fs');
const request = require('request');
const lala = require('..');

async function ping(port, path = '/'){
    return await (new Promise((resolve, reject) => {
        http.get('http://localhost:' + port + path, (response) => {
            if ( response.statusCode !== 200 ){
                return resolve(null);
            }
            let contents = '';
            response.on('data', (data) => {
                contents += data;
            });
            response.on('end', () => {
                resolve(contents);
            });
            response.on('error', () => {
                resolve(null);
            });
        });
    }));
}

function fetchHTTPResponse(url, options){
    return new Promise((resolve, reject) => {
        request.get(url, options, (error, response) => {
            if ( error !== null ){
                return reject(error);
            }
            resolve(response);
        });
    });
}

function fetchHTTPResponsePOST(url, params, options){
    if ( typeof options !== 'object' || options === null ){
        options = {};
    }
    if ( params !== null ){
        options.form = params;
    }
    return new Promise((resolve, reject) => {
        request.post(url, options, (error, response) => {
            if ( error !== null ){
                return reject(error);
            }
            resolve(response);
        });
    });
}

function attachBasicRoutes(server){
    const router = new lala.Router();
    router.get('/', () => {
        return 'OK';
    });
    server.setRouters([router]);
    return router;
}

function fileDigest(path, algorithm = 'md5'){
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm).setEncoding('hex');
        filesystem.createReadStream(path).pipe(hash).on('finish',  function () {
            resolve(this.read());
        });
    });
}

module.exports = {
    ping: ping,
    fetchHTTPResponse: fetchHTTPResponse,
    fetchHTTPResponsePOST: fetchHTTPResponsePOST,
    attachBasicRoutes: attachBasicRoutes,
    fileDigest: fileDigest
};