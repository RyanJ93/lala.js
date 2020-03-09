'use strict';

const lala = require('../..');

class BigAndComplexForm extends lala.Form {
    constructor() {
        super();

        this._mapping = {
            first_name: {
                validationRules: ['required', 'string'],
                type: 'string',
                messages: {
                    required: 'Please, tell me your name!'
                }
            },
            last_name: {
                validationRules: ['required', 'string'],
                type: 'string'
            },
            birth_day: {
                validationRules: ['required', 'date'],
                type: 'date'
            },
            gender: {
                validationRules: ['required', 'enum<M, F>'],
                type: 'enum<M, F>'
            },
            age: {
                validationRules: ['required', 'int'],
                type: 'int'
            },
            weight: {
                validationRules: ['required', 'number'],
                type: 'float'
            },
            email: {
                validationRules: ['required', 'email'],
                type: 'string'
            },
            fav_foods: {
                validationRules: ['required', 'string'],
                type: 'array<string>'
            },
            profile_url: {
                validationRules: ['required', 'URL'],
                type: 'string'
            },
            allow_cookies: {
                validationRules: ['required', 'boolean', 'accepted'],
                type: 'boolean'
            },
            some_json: {
                validationRules: ['required', 'JSON'],
                type: 'JSON'
            }
        };
    }
}

module.exports = BigAndComplexForm;
