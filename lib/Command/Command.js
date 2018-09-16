'use strict';

const { InvalidArgumentException } = require('../../index');

let commands = {};
class Command{
    static addCommand(syntax, handler, options){
        commands[syntax] = handler;
        return this;
    }

    static exec(command){
        command = command.trim().split(' ');
        if ( typeof commands[command[0]] !== 'function' ){
            //
            console.log(command[0]);
            return this;
        }
        commands[command[0]].call(this, command);
        return this;
    }
}

module.exports = Command;
