'use strict';

// Including native modules.
const filesystem = require('fs');

// Including Lala's modules.
const {
    InvalidArgumentException,
    IOException
} = require('../Exceptions');

/**
 * @typedef {Object} TLSLoadEntityMessages An object containing the messages to use whenever an exception should be thrown during entities processing.
 *
 * @property {string} invalidPath The message to use when a given entity path is not valid.
 * @property {string} invalidContent The message to use when a given entity is not valid.
 * @property {string} loadError The message to use when an error occurred while loading the entity from a file.
 */

/**
 * @typedef {Object} TLSContextProperties An object that contains the properties related to certificates that can be used to generate a new TLSContext using the native APIs.
 *
 * @property {?string[]} key An array of strings containing all the private keys that have been defined.
 * @property {?string[]} cert An array of strings containing all the certificates that have been defined.
 * @property {?string[]} ca An array of strings containing all the certificates of the certification authorities that have been defined.
 * @property {?string[]} pfx An array of strings containing all the PFX certificates that bundles all the certificates and the corresponding keys to use.
 * @property {?string} passphrase A string containing the passphrase to use to decrypt the private keys.
 * @property {?string[]} crl One or more lists containing the certificates that have been revoked and then should be rejected.
 * @property {?string} dhparam A string containing the custom parameters to use for Diffie-Hellman algorithm handshake.
 * @property {boolean} [requestCert=false] If set to "true" and when a client certificate is required, all requests providing an invalid certificate will be rejected, certificate must have been signed by one of the CA defined.
 * @property {boolean} [rejectUnauthorized=true] If set to "true" and when a client certificate is required, all requests providing an invalid certificate will be rejected, certificate must have been signed by one of the CA defined.
 */

/**
 * This class contains all the certificates and related keys to use when creating a TLS context for instance when creating a HTTPS server.
 */
class TLSContext {
    /**
     * Validates one or more given entities, if entities are path to files, they will be loaded then validated.
     *
     * @param {??(string|string[])} entity A string or an array of strings containing the entities to process.
     * @param {boolean} [file=false] If set to "true" it means that the entities are path to files and should be loaded before being processed.
     * @param {TLSLoadEntityMessages} messages An object containing the messages to use whenever an exception should be thrown.
     *
     * @returns {string[]} An array of strings containing the processed entities.
     *
     * @throws {InvalidArgumentException} If the given entity is not a valid file path.
     * @throws {InvalidArgumentException} If the given entity is not valid.
     * @throws {IOException} If an error occurred while loading the given entities from their files.
     *
     * @protected
     */
    static _loadEntities(entity, file, messages){
        const entities = [];
        if ( entity !== null ){
            if ( !Array.isArray(entity) && ( entity === '' || typeof entity !== 'string' ) ){
                if ( file === true ){
                    throw new InvalidArgumentException(messages.invalidPath, 2);
                }
                throw new InvalidArgumentException(messages.invalidContent, 1);
            }
            entity = Array.isArray(entity) ? entity : [entity];
            const length = entity.length;
            try{
                for ( let i = 0 ; i < length ; i++ ){
                    const content = file === true ? filesystem.readFileSync(entity[i]).toString() : entity;
                    if ( content !== '' && typeof content === 'string' ){
                        entities.push(content);
                    }
                }
            }catch(ex){
                throw new IOException(messages.loadError, 3, ex);
            }
        }
        return entities;
    }

    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {string[]} _privateKey The private key paired with the certificate defined, multiple private keys can be defined.
         *
         * @protected
         */
        this._privateKey = [];

        /**
         * @type {string[]} _certificate The TLS certificate, more certificates can be used.
         *
         * @protected
         */
        this._certificate = [];

        /**
         * @type {string[]} _CACertificate The TLS certificate of the certification authority that released the certificate defined, it should be used whenever a self-signed certificate has been defined.
         *
         * @protected
         */
        this._CACertificate = [];

        /**
         * @type {string[]} _PFXCertificate A PFX certificate that bundles all the certificates and keys to use.
         *
         * @protected
         */
        this._PFXCertificate = [];

        /**
         * @type {?string} _passphrase The passphrase to use to decrypt the private key defined.
         *
         * @protected
         */
        this._passphrase = null;

        /**
         * @type {string[]} One or more lists containing the certificates that have been revoked and then should be rejected.
         *
         * @protected
         */
        this._certificateRevocationLists = [];

        /**
         * @type {?string} _dhparam A string containing the custom parameters to use for Diffie-Hellman algorithm handshake.
         *
         * @protected
         */
        this._dhparam = null;

        /**
         * @type {boolean} [_requestCert=false] If set to "true" clients will be required to send a valid certificate in order to continue their requests.
         *
         * @protected
         */
        this._requestCert = false;

        /**
         * @type {boolean} [_rejectUnauthorized=true] If set to "true" and when a client certificate is required, all requests providing an invalid certificate will be rejected, certificate must have been signed by one of the CA defined.
         *
         * @protected
         */
        this._rejectUnauthorized = true;

        /**
         * @type {Object.<*, *>} _options An object containing some additional custom options to use in current TLS context.
         *
         * @protected
         */
        this._options = {}
    }

    /**
     * Sets the private key, this method is chainable.
     *
     * @param {?(string|string[])} privateKey A string containing the private key, alternatively, the path to the private key file can be used.
     * @param {boolean} [file=false] If set to "true" it means that the path to the private key file has been defined rather than its content, then it will be loaded first.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If the given path is not valid.
     * @throws {InvalidArgumentException} If the given private key is not valid.
     * @throws {IOException} If an error occurred while loading the given private keys from their files.
     */
    setPrivateKey(privateKey, file = false){
        this._privateKey = TLSContext._loadEntities(privateKey, file, {
            invalidPath: 'Invalid private key file.',
            invalidContent: 'Invalid private key.',
            loadError: 'The private key file defined cannot be loaded.'
        });
        return this;
    }

    /**
     * Returns the private keys that have been defined.
     *
     * @returns {string[]} An array of strings containing the private keys, if keys were set using paths, their contents will be returned.
     */
    getPrivateKey(){
        return this._privateKey;
    }

    /**
     * Sets the certificate, this method is chainable.
     *
     * @param {?(string|string[])} certificate A string containing the certificate, alternatively, the path to the certificate file can be used.
     * @param {boolean} [file=false] If set to "true" it means that the path to the certificate file has been defined rather than its content, then it will be loaded first.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If the given path is not valid.
     * @throws {InvalidArgumentException} If the given certificate is not valid.
     * @throws {IOException} If an error occurred while loading the given certificates from their files.
     */
    setCertificate(certificate, file = false){
        this._certificate = TLSContext._loadEntities(certificate, file, {
            invalidPath: 'Invalid certificate file.',
            invalidContent: 'Invalid certificate.',
            loadError: 'The certificate file defined cannot be loaded.'
        });
        return this;
    }

    /**
     * Returns the certificates that have been defined.
     *
     * @returns {string[]} An array of strings containing the certificates, if keys were set using paths, their contents will be returned.
     */
    getCertificate(){
        return this._certificate;
    }

    /**
     * Sets the certificate of the certification authority (CA) that released the certificate defined, this method is chainable.
     *
     * @param {?(string|string[])} certificate A string containing the CA certificate, alternatively, the path to the CA certificate file can be used.
     * @param {boolean} [file=false] If set to "true" it means that the path to the CA certificate file has been defined rather than its content, then it will be loaded first.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If the given path is not valid.
     * @throws {InvalidArgumentException} If the given CA certificate is not valid.
     * @throws {IOException} If an error occurred while loading the given certificates from their files.
     */
    setCACertificate(certificate, file = false){
        this._CACertificate = TLSContext._loadEntities(certificate, file, {
            invalidPath: 'Invalid CA certificate file.',
            invalidContent: 'Invalid CA certificate.',
            loadError: 'The CA certificate file defined cannot be loaded.'
        });
        return this;
    }

    /**
     * Returns the certification authority certificates that have been defined.
     *
     * @returns {string[]} An array of strings containing the certificates, if keys were set using paths, their contents will be returned.
     */
    getCACertificate(){
        return this._CACertificate;
    }

    /**
     * Sets the PFX certificate to use, this method is chainable.
     *
     * @param {?(string|string[])} certificate A string containing the certificate as a PFX bundle, alternatively, a file to the PFX certificate can be used.
     * @param {boolean} [file=false] If set to "true" it means that the path to the PFX certificate file has been defined rather than its content, then it will be loaded first.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If the given path is not valid.
     * @throws {InvalidArgumentException} If the given CA certificate is not valid.
     * @throws {IOException} If an error occurred while loading the given certificates from their files.
     */
    setPFXCetificate(certificate, file = false){
        this._PFXCertificate = TLSContext._loadEntities(certificate, file, {
            invalidPath: 'Invalid PFX certificate file.',
            invalidContent: 'Invalid PFX certificate.',
            loadError: 'The PFX certificate file defined cannot be loaded.'
        });
        return this;
    }

    /**
     * Returns the PFX certificate being used.
     *
     * @returns {string[]} An array of strings containing the PFX certificates, if keys were set using paths, their contents will be returned.
     */
    getPFXCetificate(){
        return this._PFXCertificate;
    }

    /**
     * Sets the passphrase to use to decrypt the private key defined, this method is chainable.
     *
     * @param {?string} passphrase A string containing the passphrase, if empty or null, no passphrase will be used as the private key defined should have been defined as a plain text.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If an invalid passphrase has been defined.
     */
    setPasshrase(passphrase){
        if ( passphrase !== null && typeof passphrase !== 'string' ){
            throw new InvalidArgumentException('Invalid passphrase.', 1);
        }
        this._passphrase = passphrase === '' ? null : passphrase;
        return this;
    }

    /**
     * Returns the passphrase defined that will be used to decrypt the private key.
     *
     * @returns {?string} A string containing the passphrase or null if no passphrase has been defined.
     */
    getPasshrase(){
        return this._passphrase;
    }

    /**
     * Sets the list containing all the certificates that have been revoked and that can potentially be issued by the clients, this method is chainable.
     *
     * @param {(string|string[])} list A string containing the list, alternatively, the  path to a file containing the list can be used.
     * @param {boolean} file If set to "true" the given list will be considered as the path to the file containing the list.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If the given path is not valid.
     * @throws {InvalidArgumentException} If the given revocation list is not valid.
     * @throws {IOException} If an error occurred while loading the given revocation lists from their files.
     */
    setCertificateRevocationList(list, file = false){
        this._certificateRevocationLists = TLSContext._loadEntities(list, file, {
            invalidPath: 'Invalid revocation list file.',
            invalidContent: 'Invalid revocation list.',
            loadError: 'The revocation list file defined cannot be loaded.'
        });
        return this;
    }

    /**
     * Returns all the list containing the revoked client certificates that have been defined.
     *
     * @returns {string[]} An array of strings containing the lists.
     */
    getCertificateRevocationList(){
        return this._certificateRevocationLists;
    }

    /**
     * Sets the parameter to use for the Diffie-Hellman algorithm during handshake, this method is chainable.
     * 
     * @param {string} dhparam A string containing the parameter, alternatively, the path to the file that contains the parameter can be used.
     * @param {boolean} [file=false] If set to "true" it means that the path to the file containing the DH parameter has been defined rather than its content, then it will be loaded first.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If the given path is not valid.
     * @throws {InvalidArgumentException} If the given PFX certificate is not valid.
     * @throws {IOException} If an error occurred while loading the given certificates from its files.
     */
    setDHParam(dhparam, file = false){
        const entities = TLSContext._loadEntities(dhparam, file, {
            invalidPath: 'Invalid file.',
            invalidContent: 'Invalid DH param.',
            loadError: 'The file containing the DH param defined cannot be loaded.'
        });
        this._dhparam = entities.length === 0 ? null : entities[0];
        return this;
    }

    /**
     * Returns the parameter to use for the Diffie-Hellman algorithm that has been defined.
     *
     * @returns {?string} A string containing the parameter or null if no parameter has been defined.
     */
    getDHParam(){
        return this._dhparam;
    }

    /**
     * Sets if the client should send a certificate in order to issue requests, this method is chainable.
     *
     * @param {boolean} requestCert If set to "true", clients will be requested to send a certificate to authenticate them self.
     *
     * @returns {TLSContext}
     */
    setRequestCert(requestCert){
        this._requestCert = requestCert === true;
        return this;
    }

    /**
     * Returns if clients should send a certificate to issue requests.
     *
     * @returns {boolean} IF clients should send a valid certificate will be returned "true".
     */
    getRequestCert(){
        return this._requestCert;
    }

    /**
     * Sets if client issued certificates should be validated according to the CA certificates that have been defined, this method is chainable.
     *
     * @param rejectUnauthorized If set to "true", client certificates must be valid certificates signed by at least one of the CA defined.
     *
     * @returns {TLSContext}
     */
    setRejectUnauthorized(rejectUnauthorized){
        this._rejectUnauthorized = rejectUnauthorized !== false;
        return this;
    }

    /**
     * Returns if the certificate issue by the clients should be validating according the CA certificates that have been defined, this method is chainable.
     *
     * @returns {boolean} If client provided certificates should be validated will be returned "true".
     */
    getRejectUnauthorized(){
        return this._rejectUnauthorized;
    }

    /**
     * Sets some custom options to use in current TLS context, this method is chainable.
     *
     * @param {Object.<*, *>} options An object containing the custom options to add or null to remove all the defined custom options.
     *
     * @returns {TLSContext}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setOptions(options){
        if ( typeof options !== 'object' ){
            throw new InvalidArgumentException('Invalid options.', 1);
        }
        this._options = options === null ? {} : options;
        return this;
    }

    /**
     * Returns all the custom options that have been defined for current TLS context.
     *
     * @returns {Object<*, *>} An object containing all the custom options defined.
     */
    getOptions(){
        return this._options;
    }

    /**
     * Returns an object that can be used to create a TLSContext using the native APIs.
     *
     * @returns {TLSContextProperties} An object containing the properties defined.
     */
    getProperties(){
        return Object.assign(this._options, {
            requestCert: this._requestCert,
            rejectUnauthorized: this._rejectUnauthorized,
            key: this._privateKey,
            cert: this._certificate,
            ca: this._CACertificate,
            pfx: this._PFXCertificate,
            passphrase: this._passphrase,
            crl: this._certificateRevocationLists,
            dhparam: this._dhparam
        });
    }
}

module.exports = TLSContext;
