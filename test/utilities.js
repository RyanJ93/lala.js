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

function generatePolicies(){
    class A extends lala.Policy {
        constructor(index){
            super();
            this.index = index;
        }

        async authorize(){
            return true;
        }
    }
    class B extends A {
        async authorize(){
            return true;
        }
    }
    class C extends A {
        async authorize(){
            return true;
        }
    }
    class D extends A {
        async authorize(){
            return true;
        }
    }
    class E extends A {
        async authorize(){
            return true;
        }
    }
    class F extends A {
        async authorize(){
            return true;
        }
    }
    return {
        A: A,
        B: B,
        C: C,
        D: D,
        E: E,
        F: F
    }
}

function getPolicyIndexes(policies){
    const indexes = [];
    for ( const policy of policies ){
        indexes.push(policy.index);
    }
    return indexes;
}

function asyncListener(obj, event){
    return new Promise((resolve) => {
        obj.on(event, (data) => {
            resolve(data);
        });
    });
}

function removeDirectory(path){
    if ( filesystem.existsSync(path) ) {
        filesystem.readdirSync(path).forEach((file, index) => {
            if ( filesystem.lstatSync(path + '/' + file).isDirectory()){
                removeDirectory(path + '/' + file);
            }else{
                filesystem.unlinkSync(path + '/' + file);
            }
        });
        filesystem.rmdirSync(path);
    }
}

module.exports = {
    ping: ping,
    fetchHTTPResponse: fetchHTTPResponse,
    fetchHTTPResponsePOST: fetchHTTPResponsePOST,
    attachBasicRoutes: attachBasicRoutes,
    fileDigest: fileDigest,
    generatePolicies: generatePolicies,
    getPolicyIndexes: getPolicyIndexes,
    asyncListener: asyncListener,
    removeDirectory: removeDirectory
};
