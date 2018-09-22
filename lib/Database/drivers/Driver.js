'use strict';

// NOTE: This class is just meant to show which method a database driver must implement.
class Driver{
    /**
     * The class constructor.
     */
    constructor(){
        // Init here your class properties.
    }

    /**
     * Establishes a connection with the database.
     *
     * @param {object} options An object containing all the parameters for the database connection.
     */
    connect(options){
        // This must return the database connection.
    }

    /**
     * Closes the connection to the database, this method is chainable.
     */
    disconnect(){
        // This method is used to close currently active connection with the database.
    }

    /**
     * Returns if a connection with the database has been established.
     */
    isConnected(){
        // Checks if a connection with the database is active.
    }
}

// module.exports = Driver;
