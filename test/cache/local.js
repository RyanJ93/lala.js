'use strict';

const assert = require('assert');
const lala = require('../../index');
const { Cache, InvalidArgumentException } = lala;
const common = require('../common');

describe('Testing framework capabilities using local cache driver.', () => {
    let cache = null, item = 'Some value 😂!', silent = {
        silent: true
    };

    it('Creating the class instance.', async () => {
        cache = new Cache();
        await cache.setDriver('local');
        cache.setNamespace('com.lala');
    });

    it('Storing and retrieving an item.', async () => {
        let item = 'Some value 😂!';
        await cache.set('test', item);
        assert.deepEqual(await cache.get('test'), item, 'Failed to store the item.');
    });

    it('Storing an item that will expire in a second.', () => {
        return new Promise((resolve, reject) => {
            cache.set('test-ttl', item, {
                ttl: 1
            }).then(() => {
                setTimeout(() => {
                    cache.exists('test-ttl', silent).then((entry) => {
                        assert.deepEqual(entry, false, 'The item has not expire yet.');
                        resolve();
                    }).catch((ex) => {
                        reject(ex);
                    });
                }, 1200);
            }).catch((ex) => {
                reject(ex);
            });
        });
    });

    it('Checking if an expired entry is removed by GC after it has expired.', () => {
        return new Promise((resolve, reject) => {
            cache.set('test-gc', item, {
                ttl: 1
            }).then(() => {
                setTimeout(() => {
                    let key = cache._driverInstance.prepareKey('test-gc');
                    if ( cache._driverInstance._storage.hasOwnProperty(key) ){
                        return reject(new Error('The item is still present in cache _storage.'));
                    }
                    resolve();
                }, 2000);
            }).catch((ex) => {
                reject(ex);
            });
        });
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

    it('Alter the TTL value for a stored item.', () => {
        return new Promise((resolve, reject) => {
            cache.set('test-ttl-update', item, {
                ttl: 10
            }).then(() => {
                cache.expire('test-ttl-update', 1).then(() => {
                    setTimeout(() => {
                        cache.exists('test-ttl-update').then((result) => {
                            if ( result ){
                                return reject(new Error('The item has not expired yet.'));
                            }
                            cache.set('test-ttl-cancellation', item, {
                                ttl: 1
                            }).then(() => {
                                cache.expire('test-ttl-cancellation', null).then(() => {
                                    setTimeout(() => {
                                        cache.exists('test-ttl-cancellation').then((result) => {
                                            if ( !result ){
                                                return reject(new Error('The item has expired instead of being persistent.'));
                                            }
                                            resolve();
                                        });
                                    }, 1200);
                                }).catch((ex) => {
                                    reject(ex);
                                });
                            }).catch((ex) => {
                                reject(ex);
                            });
                        }).catch((ex) => {
                            reject(ex);
                        });
                    }, 1200);
                }).catch((ex) => {
                    reject(ex);
                });
            }).catch((ex) => {
                reject(ex);
            });
        });
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
        assert.deepEqual(await cache.hasMulti(['1', '2', '-1']), {'1': true, '2': true, '-1': false}, '');
    });

    it('Removing multiple elements.', async () => {
        let items = {'1': false, '2': false, '-1': false};
        await cache.removeMulti(Object.keys(items));
        assert.deepEqual(await cache.existsMulti(Object.keys(items)), items, 'Unable to remove multiple elements.');
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

    it('Alter the TTL value for a multiple stored items.', () => {
        return new Promise((resolve, reject) => {
            cache.setMulti({
                a: 1,
                b: 2,
                c: 3
            }, {
                ttl: 10,
                overwrite: true
            }).then(() => {
                cache.expireMulti(['a', 'b', 'c'], 1).then(() => {
                    setTimeout(() => {
                        cache.existsMulti(['a', 'b', 'c'], true).then((exists) => {
                            if ( exists ){
                                return reject(new Error('The items have not expired within the time.'));
                            }
                            cache.setMulti({
                                e: 4,
                                f: 5,
                                g: 6
                            }, {
                                ttl: 1,
                                overwrite: true
                            }).then(() => {
                                cache.expireMulti(['e', 'f', 'g', 'h'], null).then(() => {
                                    setTimeout(() => {
                                        cache.existsMulti(['e', 'f', 'g'], true).then((exists) => {
                                            if ( !exists ){
                                                return reject(new Error('The items are still existing despite the TTL should have expired.'));
                                            }
                                            resolve();
                                        }).catch((ex) => {
                                            reject(ex);
                                        });
                                    }, 1200);
                                }).catch((ex) => {
                                    reject(ex);
                                });
                            }).catch((ex) => {
                                reject(ex);
                            });
                        }).catch((ex) => {
                            reject(ex);
                        });
                    }, 1200);
                }).catch((ex) => {
                    reject(ex);
                });
            }).catch((ex) => {
                reject(ex);
            });
        });
    });

    it('Use a sub-namespace to store a single item.', async () => {
        await cache.set('some-new-item', 'some value');
        await cache.set('some-new-item', 'some other value', {
            namespace: 'test'
        });
        const someValue = await cache.get('some-new-item');
        const someOtherValue = await cache.get('some-new-item', {
            namespace: 'test'
        });
        await cache.invalidate({
            namespace: 'test'
        });
        const result = someValue === 'some value' && someOtherValue === 'some other value';
        assert.deepEqual(result, true);
    });

    it('Override current namespace to store a single item.', async () => {
        const currentNamespace = cache.getNamespace();
        cache.setNamespace('another-test');
        await cache.set('some-new-item', 'some value');
        await cache.set('some-new-item', 'some other value', {
            namespace: 'test',
            overrideNamespace: true
        });
        cache.setNamespace('test');
        const someValue = await cache.get('some-new-item', {
            namespace: 'another-test',
            overrideNamespace: true
        });
        const someOtherValue = await cache.get('some-new-item');
        await cache.invalidate({
            namespace: 'test',
            overrideNamespace: true
        });
        await cache.invalidate({
            namespace: 'another-test',
            overrideNamespace: true
        });
        cache.setNamespace(currentNamespace);
        const result = someValue === 'some value' && someOtherValue === 'some other value';
        assert.deepEqual(result, true);
    });

    it('Drop all the stored items.', async () => {
        await cache.set('test', 'Some value 😂!');
        await cache.invalidate();
        let value = await cache.get('test', {
            silent: true
        });
        assert.deepEqual(value, null, 'Was not possible to drop all cached entries.');
    });
});