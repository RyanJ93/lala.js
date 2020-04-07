'use strict';

// Including native modules.
const filesystem = require('fs');
const BaseView = require('./BaseView');

// Including Lala's modules.
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Allows to store source code from those files that will be rendered by the view engines.
 */
class SourceRepository {
    /**
     * @type {Object.<string, string>} _repository An object containing the source code of the files that have been loaded.
     *
     * @protected
     */
    static _repository = {};

    /**
     * Loads a single file into the repository.
     *
     * @param {string} path A string containing the path to the file to load.
     *
     * @return {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     *
     * @async
     */
    static async load(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        const contents = await filesystem.promises.readFile(path);
        SourceRepository._repository[path] = contents.toString();
    }

    /**
     * Loads a single file into the repository in synchronously way.
     *
     * @param {string} path A string containing the path to the file to load.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    static loadSync(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        SourceRepository._repository[path] = filesystem.readFileSync(path).toString();
    }

    /**
     * Stores some given raw contents into the repository.
     *
     * @param {string} path A string containing the path representing the contents that will be stored.
     * @param {string} contents A string containing the contents to store.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     * @throws {InvalidArgumentException} If some invalid contents is given.
     */
    static storeRaw(path, contents){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        if ( typeof contents !== 'string' ){
            throw new InvalidArgumentException('Invalid contents.', 2);
        }
        SourceRepository._repository[path] = contents;
    }

    /**
     * Loads multiple source files into the repository.
     *
     * @param {string[]} sources An array containing multiple paths to load.
     *
     * @return {Promise<void>}
     *
     * @throws {InvalidArgumentException} If an invalid array is given.
     */
    static async preload(sources){
        if ( !Array.isArray(sources) ){
            throw new InvalidArgumentException('Invalid sources.', 1);
        }
        const processes = [], length = sources.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( sources[i] !== '' && typeof sources[i] === 'string' ){
                processes.push(SourceRepository.load(sources[i]));
            }
        }
        if ( processes.length > 0 ){
            await Promise.all(processes);
        }
    }

    /**
     * Checks if a given source file has been loaded into the repository.
     *
     * @param {string} path A string containing the path of the source file to check.
     *
     * @returns {boolean} If the given file has been loaded will be returned "true".
     */
    static isLoaded(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        return SourceRepository._repository.hasOwnProperty(path);
    }

    /**
     * Returns the contents of the given source file.
     *
     * @param {string} path A string containing the path of the source file to return.
     *
     * @returns {?string} A string containing the source file contents or null if no such file has been loaded.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    static get(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        return SourceRepository._repository.hasOwnProperty(path) ? SourceRepository._repository[path] : null;
    }

    /**
     * Removes a source file from the repository.
     *
     * @param {string} path A string containing the path of the source file to remove.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    static remove(path){
        if ( path === '' || typeof path !== 'string' ){
            throw new InvalidArgumentException('Invalid path.', 1);
        }
        delete SourceRepository._repository[path];
    }

    /**
     * Drops all the source files that have been loaded into the repository.
     */
    static clear(){
        SourceRepository._repository = {};
    }

    /**
     * Loads a source file from the repository, if no found, it is loaded from file and then both stored in the repository and returned.
     *
     * @param {string} path A string containing the path of the source file to load.
     *
     * @returns {Promise<string>} A string containing the source file contents.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     *
     * @async
     */
    static async fetch(path){
        let contents;
        if ( SourceRepository._repository.hasOwnProperty(path) ){
            contents = SourceRepository._repository[path];
        }else{
            contents = await filesystem.promises.readFile(path);
            contents = contents.toString();
        }
        return contents;
    }

    /**
     * Loads a source file from the repository, if no found, it is loaded from file and then both stored in the repository and returned.
     *
     * @param {string} path A string containing the path of the source file to load.
     *
     * @returns {string} A string containing the source file contents.
     *
     * @throws {InvalidArgumentException} If an invalid file path is given.
     */
    static fetchSync(path){
        let contents, useSourceRepository = BaseView.getUseSourceRepository();
        if ( useSourceRepository && SourceRepository._repository.hasOwnProperty(path) ){
            contents = SourceRepository._repository[path];
        }else{
            contents = filesystem.readFileSync(path).toString();
            if ( useSourceRepository ){
                SourceRepository.storeRaw(path, contents);
            }
        }
        return contents;
    }
}

module.exports = SourceRepository;
