'use strict';

// Including dependencies.
const weak = require('weak');

class WeakIndex {
    constructor(){
        this._keys = new Map();
        this._references = new Map();
    }

    set(key, value){
        const reference = weak(value, () => {console.log('GONE')
            const key = this._references.get(reference);
            if ( typeof key !== 'undefined' ){
                this._keys.delete(key);
            }
            this._references.delete(reference);
        });
        this._keys.set(key, reference);
        this._references.set(reference, key);
        return this;
    }

    get(key){
        const reference = this._keys.get(key);
        if ( typeof reference === 'undefined' ){
            return undefined;
        }
        if ( weak.isDead(reference) || weak.isNearDeath(reference) ){
            this.delete(key);
            return undefined;
        }console.log(typeof weak.get(reference), weak.get(reference));
        return weak.get(reference);
    }

    delete(key){
        const reference = this._keys.get(key);
        if ( typeof key !== 'undefined' ){
            this._references.delete(reference);
        }
        this._keys.delete(key);
        return this;
    }

    has(){
        const reference = this._keys.get(key);
        if ( typeof reference === 'undefined' ){
            return false;
        }
        if ( weak.isDead(reference) || weak.isNearDeath(reference) ){
            this.delete(key);
            return false;
        }
        return true;
    }

    drop(){
        this._keys = new Map();
        this._references = new Map();
        return this;
    }
}

module.exports = WeakIndex;