'use strict';

const Model = require('./Model');

class User extends Model{
    constructor(){
        super();
        this.entityName = 'users';
        this.attributes = {
            name: 'string',
            surname: 'string'
        };
    }

    setName(name){
        this.data.name = name;
        return this;
    }

    setSurname(surname){
        this.data.surname = surname;
        return this;
    }
}

module.exports = User;
