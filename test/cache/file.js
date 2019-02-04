'use strict';

const assert = require('assert');
const lala = require('../../index');
const {
    Cache,
    InvalidArgumentException,
} = lala;
const common = require('../common');

describe('Testing framework capabilities storing cache into files.', () => {
    let cache = null, item = 'Some value 😂!', silent = {
        silent: true
    };

    // Starting tests.
    it('Creating the class instance.', async () => {
        cache = new Cache();
        await cache.setDriver('file');
        cache.setNamespace('com.lala.file').setPath('test/resources/cache/');
    });

    it('Storing and retrieving an item.', async () => {
        await cache.set('test', item);
        assert.deepEqual(await cache.get('test', silent), item, 'Failed to store the item.');
    });

    it('Storing an item already existing.', async () => {
        await cache.set('existing-item', item);
        try{
            await cache.set('existing-item', item);
        }catch(ex){
            if ( !ex.constructor instanceof InvalidArgumentException ){
                throw ex;
            }
        }
    });

    it('Overwriting an item already existing.', async () => {
        await cache.set('overwritable-item', 'value');
        await cache.set('overwritable-item', 'new-value', {
            overwrite: true
        });
        assert.deepEqual(await cache.get('overwritable-item'), 'new-value', 'Value has not been overwritten.');
    });

    it('Storing a big item (' + common.bigCacheItemSize + ').', async () => {
        await cache.set('big-test', common.bigCacheItem);
        assert.deepEqual(await cache.get('big-test'), common.bigCacheItem, 'Failed to store the bigger item.');
    });

    it('Check if the stored item exists.', async () => {
        assert.deepEqual(await cache.exists('test'), true, 'The element was not found.');
    });

    it('Remove the stored item.', async () => {
        await cache.remove('test');
        let value = await cache.get('test', {
            silent: true
        });
        assert.deepEqual(value, null, 'The item was not removed.');
    });

    it('Increment a numeric item.', async () => {
        await cache.set('test-inc', 1);
        await cache.increment('test-inc', 2);
        assert.deepEqual(await cache.get('test-inc'), 3, 'The item was not incremented correctly.');
    });

    it('Increment a non-existing element.', async () => {
        await cache.increment('test-inc-2', 2, {
            create: true
        });
        assert.deepEqual(await cache.get('test-inc-2'), 2, 'Increment failed.');
    });

    it('Increment an ineligible element.', async () => {
        await cache.set('test-inc-3', 'abc');
        await cache.increment('test-inc-3', 2, {
            silent: true
        });
        const value = await cache.get('test-inc-3');
        assert.deepEqual(value, 'abc', 'Increment failed.');
    });

    it('Increment an value in arbitrary precision.', async () => {
        await cache.set('test-inc-4', common.bigPrimeNumber);
        await cache.increment('test-inc-4', 56666);
        const result = common.bigPrimeNumber + BigInt(56666);
        assert.deepEqual(await cache.get('test-inc-4'), result, 'Increment failed.');
    });

    it('Decrement a numeric item.', async () => {
        await cache.set('test-dec', 5);
        await cache.decrement('test-dec', 3);
        assert.deepEqual(await cache.get('test-dec'), 2, 'The item was not decremented correctly.');
    });

    it('Set and get multiple elements (' + Object.keys(common.cacheItems).length + ' items).', async () => {
        await cache.setMulti(common.cacheItems);
        let keys = Object.keys(common.cacheItems);
        keys.push('@not-found@');
        let items = await cache.getMulti(keys, {
            silent: true
        });
        let compare = Object.assign({
            '@not-found@': null
        }, common.cacheItems);
        assert.deepEqual(compare, items, 'Retrieved items are not equal to original ones.');
    });

    it('Checking if multiple elements exist.', async () => {
        assert.deepEqual(await cache.existsMulti(['1', '2', '-1']), {'1': true, '2': true, '-1': false}, '');
    });

    it('Removing multiple elements.', async () => {
        let items = {'1': false, '2': false, '-1': false};
        await cache.removeMulti(Object.keys(items));
        assert.deepEqual(await cache.hasMulti(Object.keys(items)), items, '');
    });

    it('Incrementing multiple elements.', async () => {
        let items = {'a': 1, 'b': 3.4, 'c': 8};
        await cache.setMulti(items);
        await cache.incrementMulti(['a', 'b', 'c'], 1.2);
        items = await cache.getMulti(['a', 'b', 'c', 'd'], {
            silent: true
        });
        assert.deepEqual(items, {'a': 2.2, 'b': 4.6, 'c': 9.2, 'd': null}, 'Increment failed.');
    });

    it('Increment some elements with a non existing entry.', async () => {
        let items = {'a1': 2, 'b2': 6, 'h2': common.bigPrimeNumber};
        await cache.setMulti(items);
        await cache.incrementMulti(['a1', 'b2', 'c3'], 1.8, {
            create: true
        });
        items = await cache.getMulti(['a1', 'b2', 'c3']);
        assert.deepEqual(items, {'a1': 3.8, 'b2': 7.8, 'c3': 1.8}, 'Increment failed.');
    });

    it('Increment some elements ignoring ineligible values.', async () => {
        await cache.removeMulti(['a1', 'b2', 'c3']);
        let items = {'a1': 2.4, 'b2': 6.6, 'd3': 'abc'};
        await cache.setMulti(items);
        await cache.incrementMulti(['a1', 'b2', 'c3', 'd3'], 1.8, {
            silent: true
        });
        items = await cache.getMulti(['a1', 'b2', 'c3', 'd3'], {
            silent: true
        });
        assert.deepEqual(items, {'a1': 4.2, 'b2': 8.4, 'c3': null, 'd3': 'abc'}, 'Increment failed.');
    });

    it('Decrementing multiple elements.', async () => {
        await cache.decrementMulti(['a', 'b', 'c'], 1.2);
        let items = await cache.getMulti(['a', 'b', 'c', 'd'], {
            silent: true
        });
        items.a = Math.round(items.a);
        items.b = Math.round(items.b * 10) / 10;
        items.c = Math.round(items.c);
        assert.deepEqual(items, {'a': 1, 'b': 3.4, 'c': 8, 'd': null}, 'Decrement failed.');
    });

    it('Changing the namespace in order to simulate a folder deletion.', async () => {
        cache.setNamespace('com.lala.file-2');
        await cache.set('test', item);
        const value = await cache.get('test', silent);
        await cache.invalidate();
        cache.setNamespace('com.lala.file');
        assert.deepEqual(value, item, 'Failed to store the item after namespace change.');
    });

    it('Drop all the stored items.', async () => {
        await cache.set('test', item);
        await cache.invalidate();
        let value = await cache.get('test', {
            silent: true
        });
        assert.deepEqual(value, null, 'Was not possible to drop all cached entries.');
    });
});