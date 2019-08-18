'use strict';

'use strict';

// Including Lala's modules.
const InputProcessorFactory = require('../InputProcessorFactory');
const HTTPInputProcessor = require('../../HTTP/HTTPInputProcessor');

/**
 * Allows the generation and configuration of instances of the class "HTTPInputProcessor" based on given configuration.
 */
class HTTPInputProcessorFactory extends InputProcessorFactory {
    /**
     * The class constructor.
     */
    constructor(){
        super();

        // Get default values for processor class's properties.
        this._properties = HTTPInputProcessor.getDefaultConfiguration();
    }

    /**
     * Sets the directory where uploaded files will be saved during client request processing, this method is chainable.
     *
     * @param {string} directory A string containing the path to the directory to use.
     *
     * @return {InputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid directory path is given.
     */
    setTemporaryUploadedFileDirectory(directory){
        if ( directory === '' || typeof directory !== 'string' ){
            throw new InvalidArgumentException('Invalid directory path.', 1);
        }
        if ( directory.charAt(directory.length - 1) !== '/' ){
            directory += '/';
        }
        this._properties.temporaryUploadedFileDirectory = directory;
        return this;
    }

    /**
     * Returns the  directory where uploaded files will be saved.
     *
     * @return {string} A string containing the directory being used, by default "./drive/tmp/uploads/".
     */
    getTemporaryUploadedFileDirectory(){
        return this._properties.temporaryUploadedFileDirectory;
    }

    /**
     * Sets the maximum size allowed for each uploaded file, this method is chainable.
     *
     * @param {?number} size An integer number greater than zero representing the size in bytes, if set to null, no limit will applied.
     *
     * @return {InputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid number is given as maximum file size.
     */
    setMaxUploadedFileSize(size){
        if ( isNaN(size) || size <= 0 ){
            throw new InvalidArgumentException('Invalid size.', 1);
        }
        this._properties.maxUploadedFileSize = size;
        return this;
    }

    /**
     * Returns the maximum size allowed for each uploaded file.
     *
     * @return {?number} An integer number greater than zero representing the size in bytes or null if no limit is going to be applied.
     */
    getMaxUploadedFileSize(){
        return this._properties.maxUploadedFileSize;
    }

    /**
     * Sets how many files can be accepted, this method is chainable.
     *
     * @param {?number} number An integer number greater or equal than zero representing the maximum amount of files allowed or null if no limit should be applied.
     *
     * @return {InputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid amount is given.
     */
    setMaxAllowedFileNumber(number){
        if ( isNaN(number) || number < 0 ){
            throw new InvalidArgumentException('Invalid files number.', 1);
        }
        this._properties.maxAllowedFileNumber = number;
        return this;
    }

    /**
     * Returns how many files can be accepted.
     *
     * @return {?number} An integer number greater or equal than zero representing the maximum amount allowed, if no limit is going to be applied, null will be returned instead.
     */
    getMaxAllowedFileNumber(){
        return this._properties.maxAllowedFileNumber;
    }

    /**
     * Adds one extension to the list of all the file extensions banned in file uploading, this method is chainable.
     *
     * @param {string} extension A string containing the extension to deny.
     *
     * @return {InputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid extension is given.
     */
    addDeniedFileExtension(extension){
        if ( extension === '' || typeof extension !== 'string' ){
            throw new InvalidArgumentException('Invalid extension.', 1);
        }
        extension = extension.toLowerCase().replace('.', '');
        this._properties.deniedFileExtensions.add(extension);
        return this;
    }

    /**
     * Removes an extension from the list of the extensions not allowed in file uploading, this method is chainable.
     *
     * @param {string} extension A string containing the extension to allow.
     *
     * @return {InputProcessorFactory}
     */
    removeDeniedFileExtension(extension){
        extension = extension.toLowerCase().replace('.', '');
        this._properties.deniedFileExtensions.delete(extension);
        return this;
    }

    /**
     * Sets the extensions to reject in file uploading, this method is chainable.
     *
     * @param {string[]} extensions An array containing the extensions to ban as strings.
     *
     * @return {InputProcessorFactory}
     *
     * @throws {InvalidArgumentException} If an invalid array of extensions is given.
     */
    setDeniedExtensions(extensions){
        if ( !Array.isArray(extensions) ){
            throw new InvalidArgumentException('Invalid extensions array.', 1);
        }
        this._properties.deniedFileExtensions = new Set();
        const length = extensions.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( extensions[i] !== '' && typeof extensions[i] === 'string' ){
                const extension = extensions[i].toLowerCase().replace('.', '');
                this._properties.deniedFileExtensions.add(extension);
            }
        }
        return this;
    }

    /**
     * Drops all the denied extensions marking all extensions as allowed in file uploading, this method is chainable.
     *
     * @return {InputProcessorFactory}
     */
    dropDeniedExtensions(){
        this._properties.deniedFileExtensions = new Set();
        return this;
    }

    /**
     * Returns all the extensions that has been banned in file uploading.
     *
     * @return {Set<string>} A set containing all the denied extensions.
     */
    getDeniedExtensions(){
        return this._properties.deniedFileExtensions;
    }

    /**
     * Generates an instance of the class "HTTPInputProcessor" based on the configuration properties defined in this class instance.
     *
     * @returns {HTTPInputProcessor} The generated class instance.
     *
     * @override
     */
    craft(){
        const inputProcessor = new HTTPInputProcessor();
        // Configuring class instance.
        inputProcessor.configure(this._properties);
        return inputProcessor;
    }
}

module.exports = HTTPInputProcessorFactory;
