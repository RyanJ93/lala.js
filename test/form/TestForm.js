'use strict';

const lala = require('../..');

class TestForm extends lala.Form {
    constructor() {
        super();

        this._mapping = {
            some_date: {
                type: 'date',
                validationRules: ['required', 'date']
            },
            some_number: {
                type: 'number',
                validationRules: ['required', 'numeric']
            }
        };
    }
}

module.exports = TestForm;
