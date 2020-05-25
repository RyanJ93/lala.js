'use strict';

// Including Lala's modules.
const Interceptor = require('./interceptors/Interceptor');
const {
    InvalidArgumentException
} = require('../Exceptions');

/**
 * Allows to set up conditioning rules that allow to control the whole request flow, step by step.
 */
class InterceptorRunner {
    /**
     * The class constructor.
     */
    constructor(){
        /**
         * @type {Object.<string, Set>} _interceptors An object containing the interceptors,as a set, to execute for every breakpoint (key).
         *
         * @protected
         */
        this._interceptors = Object.create(null);
    }

    /**
     * Adds an interceptor to the list of all the interceptors to execute, this method is chainable.
     *
     * @param {Interceptor} interceptor A class representing an interceptor, note that it must extend the "Interceptor" abstract class.
     *
     * @returns {InterceptorRunner}
     *
     * @throws {InvalidArgumentException} If an invalid interceptor is given.
     */
    addInterceptor(interceptor){
        if ( !( interceptor instanceof Interceptor ) ){
            throw new InvalidArgumentException('Invalid interceptor.', 1);
        }
        const breakpoints = interceptor.getSupportedBreakpoints();
        const length = breakpoints.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( !( this._interceptors[breakpoints[i]] instanceof Set ) ){
                this._interceptors[breakpoints[i]] = new Set();
            }
            this._interceptors[breakpoints[i]].add(interceptor);
        }
        return this;
    }

    /**
     * Removes a given interceptor from the list of all the interceptors to execute, this method is chainable.
     *
     * @param {Interceptor} interceptor A class representing an interceptor.
     *
     * @returns {InterceptorRunner}
     *
     * @throws {InvalidArgumentException} If an invalid interceptor is given.
     */
    removeInterceptor(interceptor){
        if ( !( interceptor instanceof Interceptor ) ){
            throw new InvalidArgumentException('Invalid interceptor.', 1);
        }
        const breakpoints = interceptor.getSupportedBreakpoints();
        const length = breakpoints.length;
        for ( let i = 0 ; i < length ; i++ ){
            if ( this._interceptors[breakpoints[i]] instanceof Set ){
                this._interceptors[breakpoints[i]].delete(interceptor);
            }
        }
        return this;
    }

    /**
     * Drops all the interceptors defined, this method is chainable.
     *
     * @returns {InterceptorRunner}
     */
    dropInterceptors(){
        this._interceptors = Object.create(null);
        return this;
    }

    /**
     * Processes all the interceptors for a given request processing phase.
     *
     * @param {string} breakpoint A string containing the name of the request processing phase being execute.
     * @param {module:http.IncomingMessage} request An instance of the built-in class "IncomingMessage" containing all the connection properties.
     * @param {module:http.ServerResponse} response An instance of the built-in class "ServerResponse" representing the response that will be sent back to the client.
     *
     * @returns {Promise<boolean>} If given client request can continue according to executed interceptors will be returned "true", otherwise "false" or an exception could be thrown.
     *
     * @async
     */
    async run(breakpoint, request, response){
        let result = true;
        if ( this._interceptors[breakpoint] instanceof Set ){
            for ( const interceptor of this._interceptors[breakpoint] ){
                const consent = await interceptor.intercept(breakpoint, request, response);
                if ( !consent ){
                    result = false;
                    break;
                }
            }
        }
        return result;
    }
}

module.exports = InterceptorRunner;
