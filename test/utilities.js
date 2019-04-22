'use strict';

const http = require('http');
const request = require('request');

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

module.exports = {
    ping: ping,
    fetchHTTPResponse: fetchHTTPResponse,
};