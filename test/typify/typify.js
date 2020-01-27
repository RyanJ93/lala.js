'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing typify.', () => {
    it('Casting a single value.', () => {
        const value = lala.Typify.typifyValue('123', 'int');
        assert.deepEqual(value, 123);
    });

    it('Casting a simple object.', async () => {
        const values = lala.Typify.typify({
            name: 'string',
            age: 'int',
            height: 'float',
            weight: 'number',
            active: 'boolean',
            score: 'bigint',
            birth_date: 'date'
        }, {
            name: 'Test',
            age: '45',
            height: '1.78',
            weight: '89',
            active: 'true',
            score: '742094726374671209472364703912',
            birth_date: '1990-12-12'
        });
        assert.deepStrictEqual(values, {
            name: 'Test',
            age: 45,
            height: 1.78,
            weight: 89,
            active: true,
            score: BigInt('742094726374671209472364703912'),
            birth_date: new Date('1990-12-12')
        });
    });

    it('Casting a more complex single value.', () => {
        const value = lala.Typify.typifyValue('Test,56,45.111,2000-11-09', 'tuple<string, int, float, date>');
        assert.deepEqual(value, ['Test', 56, 45.111, new Date('2000-11-09')]);
    });

    it('Casting a more complex object.', () => {
        const values = lala.Typify.typify({
            name: 'string',
            numbers: 'array<int>',
            values: 'tuple<int, number, boolean>',
            unique_numbers: 'set<float>'
        }, {
            name: 'Test',
            numbers: '1,2,3,4',
            values: '1,56.3,false',
            unique_numbers: '1,2,1,3'
        });
        assert.deepStrictEqual(values, {
            name: 'Test',
            numbers: [1, 2, 3, 4],
            values: [1, 56.3, false],
            unique_numbers: new Set([1, 2, 3])
        });
    });

    it('Casting an object containing optional properties.', () => {
        const values = lala.Typify.typify({
            required: 'number',
            optional: '?float'
        }, {
            required: '78'
        }, true);
        assert.deepStrictEqual(values, {
            required: 78
        });
    });

    it('Casting an object containing some missing data.', () => {
        const values = lala.Typify.typify({
            name: 'string',
            surname: '?string',
            weight: '?number',
            birth_day: 'date'
        }, {
            name: 'Sig.',
            surname: 'Test'
        }, true);
        assert.deepStrictEqual(values, null);
    });

    it('Casting multiple values.', () => {
        const values = lala.Typify.typifyMultipleValues(['3,2,7', '1,4,9'], 'array<int>');
        assert.deepStrictEqual(values, [[3, 2, 7], [1, 4, 9]]);
    });

    it('Casting multiple objects.', () => {
        const values = lala.Typify.typifyMulti({
            name: 'string',
            surname: '?string',
            weight: '?number',
            age: 'int'
        }, [{
            name: 'Sig.',
            surname: 'Test',
            age: '41'
        }, {
            name: 'Sig.2',
            surname: 'Test2',
            weight: '67',
            age: '34'
        }]);
        assert.deepStrictEqual(values, [{
            name: 'Sig.',
            surname: 'Test',
            age: 41,
            weight: null
        }, {
            name: 'Sig.2',
            surname: 'Test2',
            weight: 67,
            age: 34
        }]);
    });
});
