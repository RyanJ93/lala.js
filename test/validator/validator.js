'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing validation engine.', () => {
    it('Validating a simple set of values.', async () => {
        const validator = new lala.Validator({
            test: ['gt<2>'],
            max_value: ['lte<43.2>', 'numeric']
        });
        const positiveResult = await validator.validate({
            test: 12,
            max_value: 40
        });
        const negativeResult = await validator.validate({
            test: 12,
            max_value: 50
        });
        const result = positiveResult && !negativeResult;
        assert.deepStrictEqual(result, true);
    });

    it('Validate a set of values containing a missing non required field.', async () => {
        const validator = new lala.Validator({
            field: ['numeric'],
            missing_field: ['numeric']
        });
        const result = await validator.validate({
            field: 12
        });
        assert.deepStrictEqual(result, true);
    });

    it('Validate a set of values containing a missing required field.', async () => {
        const validator = new lala.Validator({
            field: ['numeric', 'required'],
            missing_field: ['numeric', 'required']
        });
        const result = await validator.validate({
            field: 12
        });
        assert.deepStrictEqual(result, false);
    });

    it('Validate a set of value containing a reference to another field.', async () => {
        const validator = new lala.Validator({
            test: ['gt<$max_value>'],
            max_value: ['lte<43.2>', 'numeric']
        });
        const positiveResult = await validator.validate({
            test: 41,
            max_value: 40
        });
        const negativeResult = await validator.validate({
            test: 14,
            max_value: 34
        });
        const result = positiveResult && !negativeResult;
        assert.deepStrictEqual(result, true);
    });

    it('Setting custom error message for a rule.', async () => {
        const validator = new lala.Validator({
            test: ['gt<67>']
        }, {
            test: {
                gt: 'Custom error.'
            }
        });
        await validator.validate({
            test: 15
        });
        assert.deepStrictEqual(validator.getErrors(), {
            test: {
                gt: 'Custom error.'
            }
        });
    });
});
