'use strict';

// Including Lala's modules.
const Peke = require('../ORM/Peke');

class Model extends Peke{
    constructor(){
        super();
        this.entityName = null;
        this.attributes = {};
        this.primaryKeys = [];
        this.data = {};
        this.bound = false;
        this.validate = true;
    }

    isBound(){
        return this.bound === true;
    }

    validateData(){

    }

    async save(){
        if ( this.validate !== false ){
            this.validateData();
        }
        this.insert(this.data);
        this.bound = true;
        return this;
    }

    static async find(){
        console.log(arguments);
    }
}

module.exports = Model;
