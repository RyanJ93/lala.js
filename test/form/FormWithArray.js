'use strict';

const lala = require('../..');

class FormWithArray extends lala.Form {
    constructor() {
        super();

        this._mapping = {
            some_array: {
                type: 'number',
                validationRules: ['required', 'array']
            },
            another_array: {
                type: 'string',
                validationRules: ['required']
            }
        };
    }
}

module.exports = FormWithArray;
