'use strict';

// Including Lala's modules.
const { generateUUID } = require('../Helpers/helpers/BuiltInHelpers');
const Repository = require('../Repository/Repository');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents a single authentication session for a single authenticated user.
 */
class UserSession {
    /**
     * Returns the user session matching the given unique ID.
     *
     * @param {string} sessionID A string representing the session unique ID, usually, a string representation of an UUID version 4.
     *
     * @returns {(UserSession|null)}
     *
     * @throws {InvalidArgumentException} If an invalid session ID is given.
     */
    static getUserSession(sessionID){
        if ( sessionID === '' || typeof sessionID !== 'string' ){
            throw new InvalidArgumentException('Invalid session ID.', 1);
        }
        const session = Repository.get(sessionID, 'com.lala.authenticator.userSession');
        return typeof session === 'undefined' ? null : session;
    }

    /**
     * The class constructor.
     *
     * @param {?string} [id] A string representing the session ID, it should be unique within the session stack.
     * @param {?object} [user] A custom object representing the authenticated user.
     * @param {?object} [client] A custom object representing the client this session has been established with.
     */
    constructor(id = null, user = null, client = null){
        /**
         * @type {?object} [_user=null] A custom object representing the authenticated user.
         *
         * @protected
         */
        this._user = null;

        /**
         * @type {?object} [_client=null] A custom object representing the client this session has been established with.
         *
         * @protected
         */
        this._client = null;

        /**
         * @type {boolean} [_pending=false] If set to "true" it means that the user, that this session belongs to, is still being authenticated.
         *
         * @protected
         */
        this._pending = false;

        /**
         * @type {string} [_id=""] A string representing this session ID.
         *
         * @protected
         */
        this._id = id !== '' && typeof id === 'string' ? id : generateUUID(4, false);

        /**
         * @type {*} [_context=null] An arbitrary value containing the saved context fro this session, for instance, authentication parameters during a multi step authentication process.
         *
         * @protected
         */
        this._context = null;

        /**
         * @type {number} [_ttl=0] An integer number greater than zero representing the amount of seconds this session will live for, if set to zero, this session will last forever.
         *
         * @protected
         */
        this._ttl = 0;

        /**
         * @type {?Timeout} [_GCTimeout=null] An instance of the class "Timeout" representing the reference to the created timer used to close the session once expired.
         *
         * @protected
         */
        this._GCTimeout = null;

        /**
         * @type {?Date} [_lastSeen=null] A date representing last moment the authenticated user, that this session belongs to, visited a resource.
         *
         * @protected
         */
        this._lastSeen = null;

        if ( user !== null && typeof user === 'object' ){
            this.setUser(user);
        }
        if ( client !== null && typeof client === 'object' ){
            this.setClient(client);
        }
    }

    /**
     * Returns the session ID.
     *
     * @returns {string} A string representing the session ID.
     */
    getID(){
        return this._id;
    }

    /**
     * Sets the object that represents the authenticated user, this method is chainable.
     *
     * @param {?object} user A custom object that represents the user.
     *
     * @returns {UserSession}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setUser(user){
        if ( typeof user !== 'object' ){
            throw new InvalidArgumentException('Invalid user object.', 1);
        }
        this._user = user;
        return this;
    }

    /**
     * Returns the object that represents the authenticated user.
     *
     * @returns {object} An object representing the authenticated user or null if no user object has been defined.
     */
    getUser(){
        return this._user;
    }

    /**
     * Sets the object containing client properties, this method is chainable.
     *
     * @param {object} client A custom object representing client this session has been established with.
     *
     * @returns {UserSession}
     *
     * @throws {InvalidArgumentException} If an invalid object is given.
     */
    setClient(client){
        if ( client === null || typeof client !== 'object' ){
            throw new InvalidArgumentException('Invalid client object.', 1);
        }
        this._client = client;
        return this;
    }

    /**
     * Returns the object that represents the client this session has been established with.
     *
     * @returns {object} An object representing the authenticated user or null if no user object has been defined yet.
     */
    getClient(){
        return this._client;
    }

    /**
     * Sets if this session is currently under authentication or if has been completed and confirmed, this method is chainable.
     *
     * @param {boolean} pending If set to "true" this session will be marked as net completed yet.
     *
     * @returns {UserSession}
     */
    setPending(pending){
        this._pending = pending === true;
        return this;
    }

    /**
     * Returns if this session is completed or not.
     *
     * @returns {boolean} If authentication for this session has been completed and it has been marked as completed will be returned "true".
     */
    getPending(){
        return this._pending;
    }

    /**
     * Adds some custom data to this session context, useful, for instance, during the authentication process, this method is chainable.
     *
     * @param context An arbitrary value, usually an object, pass null to empty the context.
     *
     * @returns {UserSession}
     */
    setContext(context){
        this._context = context;
        return this;
    }

    /**
     * Returns the context data that has been defined.
     *
     * @returns {*} An arbitrary value containing the context data or null if no data has been defined.
     */
    getContext(){
        return this._context;
    }

    /**
     * Sets the expiration time for this session, this method is chainable.
     *
     * @param {?number} ttl An integer number representing the amount of time in seconds after this session will expire, if set to zero or null, this session will last forever.
     *
     * @returns {UserSession}
     *
     * @throws {InvalidArgumentException} If an invalid amount of seconds is given.
     */
    setTTL(ttl){
        if ( ttl !== null && ( isNaN(ttl) || ttl <= 0 ) ){
            throw new InvalidArgumentException('Invalid TTL value.', 1);
        }
        if ( ttl === null ){
            // Unset current internal TTL.
            this._ttl = 0;
            // Reset session GC timer.
            this.renew();
            return this;
        }
        this._ttl = ttl;
        // Apply the TTL value defined.
        this.renew();
        return this;
    }

    /**
     * Returns the amount of seconds this session will last for.
     *
     * @returns {number} An integer number representing the amount of time in seconds after this session will expire or zero if this session has no expire.
     */
    getTTL(){
        return this._ttl;
    }

    /**
     * Returns the date when this session will expire.
     *
     * @returns {?Date} An instance of the class "Date" representing the expire date or null if no expire date has ben defined.
     */
    getExpireDate(){
        if ( this._ttl === 0 ){
            return null;
        }
        const date = new Date()
        date.setSeconds(date.getSeconds() + this._ttl);
        return date;
    }

    /**
     * Extends the time to live of this session by the TTL amount defined, this method is chainable.
     *
     * @returns {UserSession}
     */
    renew(){
        if ( this._GCTimeout !== 0 ){
            // Stop previously declared timeout function.
            clearTimeout(this._GCTimeout);
        }
        if ( this._ttl !== 0 ){
            // Define the timeout function that will close this session once it has expired.
            this._GCTimeout = setTimeout(() => {
                this.close();
            }, this._ttl * 1000);
        }
        return this;
    }

    /**
     * Removes this session from the list of all the session currently opened, this method is chainable.
     *
     * @returns {UserSession}
     */
    close(){
        Repository.remove(this._id, 'com.lala.authenticator.userSession');
        return this;
    }

    /**
     * Registers this session in the list list of all the session currently opened, this method is chainable.
     *
     * @returns {UserSession}
     */
    register(){
        Repository.register(this._id, this, 'com.lala.authenticator.userSession', true);
        return this;
    }

    /**
     * Sets the last seen date of this session to now, this method is chainable.
     *
     * @returns {UserSession}
     */
    updateLastSeen(){
        this._lastSeen = new Date();
        return this;
    }
}

module.exports = UserSession;
