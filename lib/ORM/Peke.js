'use strict';

const Database = require('../Database/Database');

class Peke{
    static entity(entity, connection){
        return new Peke(entity, connection);
    }

    constructor(entity, connection){
        this.database = connection !== '' && typeof connection === 'string' ? Database.getConnection(connection) : Database.getMainConnection();
        if ( this.database === null ){
            //
        }
        this.connection = null;
        if ( entity !== '' && typeof entity === 'string' ){
            this.entityName = entity;
            this._prepare();
        }
    }

    _prepare(){
        this.databaseDriver = this.database.getDriver();
        if ( this.entityName !== '' && typeof this.entityName === 'string' ){
            switch ( this.databaseDriver ){
                case 'mongodb':{
                    this.connection = this.database.getConnection().collection(this.entityName);
                }break;
            }
        }
    }

    setEntity(entity){
        this.entityName = entity;
        this._prepare();
        return this;
    }

    getEntity(){
        return this.entityName;
    }

    ready(){
        if ( this.connection === null ){
            this._prepare();
        }
        return this.connection !== null;
    }

    async insert(entry){
        if ( this.ready() === false ){
            //
        }
        switch ( this.databaseDriver ){
            case 'mongodb':{
                await this.connection.insertOne(entry);
            }break;
        }
    }
}

module.exports = Peke;
