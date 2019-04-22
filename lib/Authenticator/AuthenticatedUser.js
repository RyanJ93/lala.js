'use strict';

// Including Lala's modules.
const UserSession = require('./UserSession');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Represents an authenticated user containing all the active sessions.
 */
class AuthenticatedUser {
    /**
     * The class constructor.
     *
     * @param {?object} [user] An object representing the user this class instance belongs to.
     */
    constructor(user){
        /**
         * @type {(object|null)} _user A custom object representing the user.
         *
         * @protected
         */
        this._user = typeof user === 'object' ? user : null;

        /**
         * @type {Map<string, UserSession>} _sessions A map containing all the auth sessions of the user represented by this class having as key the unique session ID and as value an instance of the class "UserSession" representing the session itself.
         *
         * @protected
         */
        this._sessions = new Map();
    }

    /**
     * Adds an entry to the list of all the authentication session belonging to this user, this method is chainable.
     *
     * @param {UserSession} session An instance of the class "UserSession" representing the session to add.
     *
     * @returns {AuthenticatedUser}
     *
     * @throws {InvalidArgumentException} If the given parameters is not a valid session.
     */
    addSession(session){
        if ( !session instanceof UserSession ){
            throw new InvalidArgumentException('Invalid user session.', 1);
        }
        this._sessions.set(session.getID(), session);
        return this;
    }

    /**
     * Removes an entry from the user's authentication session list, this method is chainable.
     *
     * @param {string} id A string representing the session ID, usually a string representation of an UUID version 4.
     *
     * @returns {AuthenticatedUser}
     */
    removeSession(id){
        this._sessions.delete(id);
        return this;
    }

    /**
     * Returns a session from its ID.
     *
     * @param {string} id A string representing the session ID
     *
     * @returns {UserSession} An instance of the class "UserSession" representing the session found or null if no session matching the given ID is found.
     */
    getSession(id){
        const session = this._sessions.get(id);
        return typeof session !== 'undefined' ? session : null;
    }

    /**
     * Drops all the user sessions, this method is chainable.
     *
     * @param {boolean} [close=false] If set to "true", before dropping sessions, they will be closed, by default they are preserved.
     *
     * @returns {AuthenticatedUser}
     */
    dropSessions(close = false){
        if ( close === true ){
            for ( const session of this._sessions ){
                session.close();
            }
        }
        this._sessions = new Map();
        return this;
    }

    /**
     * Returns all the sessions attached to this user.
     *
     * @returns {Map<string, UserSession>} A map having as key the session ID and as value an instance of the class "UserSession" representing the session.
     */
    getAllSessions(){
        return this._sessions;
    }

    /**
     * Checks if this user has at least one active session.
     *
     * @returns {boolean} If at least one active session is found for this user will be returned "true", otherwise "false".
     */
    authenticated(){
        let authenticated = false;
        for ( const session of this._sessions ){
            if ( !session.getPending() ){
                authenticated = true;
                break;
            }
        }
        return authenticated;
    }

    /**
     * Sets the user for this class instance, this method is chainable.
     *
     * @param {?object} user An object representation of the user.
     *
     * @throws {InvalidArgumentException} If an invalid user object is given.
     */
    setUser(user){
        if ( typeof user !== 'object' ){
            throw new InvalidArgumentException('Invalid user object.', 1);
        }
        this._user = user;
        return this;
    }

    /**
     * Returns the user associated to this class.
     *
     * @returns {object} An object representation of the user or null if no user has been defined yet.
     */
    getUser(){
        return this._user;
    }
}

module.exports = AuthenticatedUser;
