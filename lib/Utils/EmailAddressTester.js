'use strict';

// Including native modules.
const net = require('net');
const dns = require('dns');

// Including Lala's modules.
const {
    InvalidArgumentException,
    RuntimeException
} = require('../Exceptions');

/**
 * Allows to check if an email address exists.
 */
class EmailAddressTester {
    /**
     * Generates the exception to thrown based on the SMTP server message within the given context.
     *
     * @param {?string} message A string containing the error message returned by the SMTP server.
     *
     * @returns {Exception} The exception to throw.
     *
     * @protected
     */
     _identifyError(message){
        let exception = null;
        if ( this._state === 0 && message === null ){
            // The server has instantly closed the connection.
            exception = new RuntimeException('Connection closed by peer, perhaps attempt was blocked by an anti-spam agent?', 2);
        }else if ( message !== null ){
            let hasBeenBlocked = false, i = 0;
            // Lock for anti-spam traces.
            while ( !hasBeenBlocked && i < EmailAddressTester.ANTI_SPAM_MARKERS.length ){
                hasBeenBlocked = message.indexOf(EmailAddressTester.ANTI_SPAM_MARKERS[i]) > 0;
                i++;
            }
            if ( hasBeenBlocked ){
                exception = new RuntimeException('Connection rejected peer\'s anti-spam agent.', 3);
            }
        }
        return exception === null ? new RuntimeException('Unexpected connection error.', 1) : exception;
    }

    /**
     * Resolves a given domain in order to extract the MX records from the DNS result.
     *
     * @param {string} domain A string containing the domain to resolve.
     *
     * @returns {Promise<MxRecord[]>} An array of objects containing the MX records found.
     *
     * @throws {RuntimeException} If an error occurs while resolving the MX address.
     *
     * @async
     * @protected
     */
    _resolveMX(domain){
        return new Promise((resolve, reject) => {
            // Resolve the given domain.
            dns.resolveMx(domain.toLowerCase(), (error, data) => {
                // Drop timeout as request has ended.
                clearTimeout(timeout);
                if ( error !== null ){
                    if ( error.code === 'ENOTFOUND' ){
                        return resolve(null);
                    }else{
                        return reject(new RuntimeException('An error occurred while resolving the MX.', 1, error));
                    }
                }
                resolve(data);
            });
            // Emulate timeout on DNS resolution.
            let timeout = setTimeout(() => {
                resolve(null);
            }, this._DNSResolutionTimeout * 1000);
        });
    }

    /**
     * Keeps going on the communication with the server according to current response.
     *
     * @param {string} response A string containing the response from the server.
     * @param {module:net.Socket} client An instance of the native class "Socket" representing the connection with the server.
     * @param {string} host A string containing the host the given client is currently connected to.
     *
     * @throws {RuntimeException} If an unexpected error occurs during the request.
     * @throws {RuntimeException} If the connection gets closed immediately without any reason.
     * @throws {RuntimeException} If the connection gets closed and an anti-spam agent message is spotted.
     * @throws {RuntimeException} If no response is received within the probing timeout time defined.
     *
     * @protected
     */
    _handleHostResponse(response, client, host){
        const currentState = this._state;
        // Extract the response code from the response message.
        const code = response === '' ? null : parseInt(response.substr(0, 3));
        switch ( this._state ){
            case 0: {
                if ( code === 250 || code === 220 ){
                    client.write('HELO ' + host.replace(/[\n\r<>]/g, '') + '\r\n');
                    this._state = 1;
                }
            }break;
            case 1: {
                if ( code === 250 || code === 220 ){
                    client.write('MAIL FROM: <no-reply@mail.com>\r\n');
                    this._state = 2;
                }
            }break;
            case 2: {
                if ( code === 250 || code === 220 ){
                    client.write('RCPT TO: <' + this._email.replace(/[\n\r<>]/g, '') + '>\r\n');
                    this._state = 3;
                }
            }break;
            case 3: {
                if ( code === 250 || code === 220 ){
                    // The email address exists.
                    client.write('QUIT\r\n');
                    this._state = 4;
                }else if ( code === 550 ){
                    // The email address doesn't exists.
                    client.write('QUIT\r\n');
                    this._state = 6;
                }
            }break;
            case 4:
            case 6: {
                if ( code === 221 ){
                    this._state = this._state === 4 ? 5 : 7;
                    client.destroy();
                }
            }break;
        }
        if ( currentState === this._state ){
            // State has not changed, then an error occurred or has been returned.
            throw this._identifyError(response);
        }
    }

    /**
     * Simulates an email sending according to the SMTP protocol.
     *
     * @param {string} host A string containing the MX host to probe.
     *
     * @returns {Promise<boolean>} If the given MX host is online and the given email address is recognized by it will be returned "true".
     *
     * @throws {RuntimeException} If an unexpected error occurs during the request.
     * @throws {RuntimeException} If the connection gets closed immediately without any reason.
     * @throws {RuntimeException} If the connection gets closed and an anti-spam agent message is spotted.
     * @throws {RuntimeException} If no response is received within the probing timeout time defined.
     * @throws {RuntimeException} If no response is received within the timeout defined.
     *
     * @async
     * @protected
     */
    _probe(host){
        return new Promise((resolve, reject) => {
            let timeout = this._probingTimeout * 1000, communicationTimeoutID = null;
            // Create a TCP connection with the given host.
            const client = net.connect({
                port: 25,
                host: host,
                timeout: timeout
            });
            this._state = 0;
            client.on('data', (data) => {
                try{
                    // Reset the timeout timer.
                    if ( communicationTimeoutID !== null ){
                        clearTimeout(communicationTimeoutID);
                    }
                    if ( this._state === 5 || this._state === 7 ){
                        client.destroy();
                    }else{
                        // Handle server response.
                        this._handleHostResponse(data.toString(), client, host);
                        // Start the timeout timer.
                        communicationTimeoutID = setTimeout(() => {
                            this._state = -1;
                            client.destroy();
                            reject(new RuntimeException('Communication timeout.', 5));
                        }, timeout);
                    }
                }catch(ex){
                    client.destroy();
                    reject(ex);
                }
            });
            client.on('close', () => {
                // Reset the timeout timer.
                if ( communicationTimeoutID !== null ){
                    clearTimeout(communicationTimeoutID);
                }
                if ( this._state === 5 || this._state === 7 ){
                    resolve(this._state === 5);
                }else{
                    reject(new RuntimeException('Unexpected connection error.', 1));
                }
            });
            client.on('error', (error) => {
                // Reset the timeout timer.
                if ( communicationTimeoutID !== null ){
                    clearTimeout(communicationTimeoutID);
                }
                // Close the connection.
                client.destroy();
                reject(new RuntimeException('Unexpected connection error.', 1, error));
            });
        });
    }

    /**
     * The class constructor.
     *
     * @param {string} email A string containing the email address to test.
     *
     * @throws {InvalidArgumentException} If an invalid email address is given.
     */
    constructor(email){
        /**
         * @type {?string} [_email] A string containing the the email address to test.
         *
         * @protected
         */
        this._email = null;

        /**
         * @type {number} [_DNSResolutionTimeout=3] An integer value greater or equal than zero representing the amount of seconds after te DNS query connection should be dropped, if zero no timeout will be applied.
         *
         * @protected
         */
        this._DNSResolutionTimeout = 3;

        /**
         * @type {number} [_probingTimeout=3] An integer value greater or equal than zero representing the amount of seconds after a SMTP connection should be closed whenever waiting for a message response, if zero no timeout will be applied.
         *
         * @private
         */
        this._probingTimeout = 3;

        /**
         * @type {?string} [_lastPeerErrorMessage] A string containing the last error message returned from the SMTP server.
         *
         * @protected
         */
        this._lastPeerErrorMessage = null;

        /**
         * @type {number} [_state=0] An integer number representing the state of the email probing process.
         *
         * @protected
         */
        this._state = 0;

        if ( email === '' || typeof email !== 'string' ){
            throw new InvalidArgumentException('Invalid email address.', 1);
        }
        this._email = email;
    }

    /**
     * Sets the email address to check, this method is chainable.
     *
     * @param {string} email A string containing the email address to test.
     *
     * @returns {EmailAddressTester}
     *
     * @throws {InvalidArgumentException} If an invalid email address is given.
     */
    setEmail(email){
        if ( email === '' || typeof email !== 'string' ){
            throw new InvalidArgumentException('Invalid email address.', 1);
        }
        this._email = email;
        return this;
    }

    /**
     * Returns the email address being tested.
     *
     * @returns {?string} A string containing the email address.
     */
    getEmail(){
        return this._email;
    }

    /**
     * Sets the DNS query request timeout, this method is chainable.
     *
     * @param {number} DNSResolutionTimeout An integer value greater or equal than zero representing the timeout in seconds, if zero no timeout will be applied.
     *
     * @returns {EmailAddressTester}
     *
     * @throws {InvalidArgumentException} If an invalid timeout value is given.
     */
    setDNSResolutionTimeout(DNSResolutionTimeout){
        if ( DNSResolutionTimeout === null || isNaN(DNSResolutionTimeout) || DNSResolutionTimeout < 0 ){
            throw new InvalidArgumentException('Invalid timeout value.', 1);
        }
        this._DNSResolutionTimeout = DNSResolutionTimeout;
        return this;
    }

    /**
     * Returns the timeout that will be applied to the DNS query request.
     *
     * @returns {number} An integer value greater or equal than zero representing the timeout in seconds.
     */
    getDNSResolutionTimeout(){
        return this._DNSResolutionTimeout;
    }

    /**
     * Sets the SMTP communication timeout, this method is chainable.
     *
     * @param {number} probingTimeout An integer value greater or equal than zero representing the timeout in seconds, if zero no timeout will be applied.
     *
     * @returns {EmailAddressTester}
     *
     * @throws {InvalidArgumentException} If an invalid timeout value is given.
     */
    setProbingTimeout(probingTimeout){
        if ( probingTimeout === null || isNaN(probingTimeout) || probingTimeout < 0 ){
            throw new InvalidArgumentException('Invalid timeout value.', 1);
        }
        this._probingTimeout = probingTimeout;
        return this;
    }

    /**
     * Returns the timeout that will be applied to the the SMTP communications.
     *
     * @returns {number} An integer value greater or equal than zero representing the timeout in seconds.
     */
    getProbingTimeout(){
        return this._probingTimeout;
    }

    /**
     * Returns the last error message returned by the SMTP server.
     *
     * @returns {?string} A string containing the message or null if no error occurred.
     */
    getLastPeerErrorMessage(){
        return this._lastPeerErrorMessage;
    }

    /**
     * Tests the email address defined.
     *
     * @returns {Promise<boolean>} If the email address exists will be returned "true".
     *
     * @throws {RuntimeException} If an error occurs while resolving the MX address.
     * @throws {RuntimeException} If an unexpected error occurs during the request.
     * @throws {RuntimeException} If the connection gets closed immediately without any reason.
     * @throws {RuntimeException} If the connection gets closed and an anti-spam agent message is spotted.
     *
     * @async
     */
    async test(){
        this._lastPeerErrorMessage = null;
        let valid = false;
        // Split the email address into the username and domain.
        const components = this._email.split('@');
        if ( components.length === 2 ){
            // Resolve the provider's domain and extract the MX addresses.
            const exchanges = await this._resolveMX(components[1]);
            if ( exchanges !== null ){
                let i = 0, length = exchanges.length;
                //
                while ( !valid && i < length ){
                    valid = await this._probe(exchanges[i].exchange);
                    i++;
                }
            }
        }
        return valid;
    }
}

/**
 * @constant Contains a list of keyword used by anti-spam agents in their error messages.
 *
 * @type {string[]}
 * @default
 */
Object.defineProperty(EmailAddressTester, 'ANTI_SPAM_MARKERS', {
    value: ['blocked', 'Spamhaus'],
    writable: false
});

module.exports = EmailAddressTester;
