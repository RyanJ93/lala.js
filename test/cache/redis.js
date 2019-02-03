'use strict';

const assert = require('assert');
const lala = require('../../index');
const { RedisConnection } = lala.DatabaseConnections;
const { RedisCacheDriver } = lala.CacheDrivers;
const {
    Cache,
    InvalidArgumentException
} = lala;
const common = require('../common');

describe('Testing framework capabilities using Redis as cache driver.', () => {
    let cache = null, connection = null, item = 'Some value 😂!', silent = {
        silent: true
    };

    it('Set up a default Redis connection.', async () => {
        connection = new RedisConnection();
        await connection.setPassword('test').connect();
        RedisCacheDriver.addConnection('default', connection);
        Cache.setDefaultDriverConnection('redis', 'default');
    });

    // Starting tests.
    it('Creating the class instance.', async () => {
        cache = new Cache();
        await cache.setDriver('redis');
        cache.setNamespace('com.lala.redis');
    });

    it('Storing and retrieving an item.', async () => {
        await cache.set('test', item);
        assert.deepEqual(await cache.get('test', silent), item, 'Failed to store the item.');
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
        await cache.incrementMulti(['a', 'b', 'c', 'd'], 1.2);
        items = await cache.getMulti(['a', 'b', 'c', 'd']);
        assert.deepEqual(items, {'a': '2.2', 'b': '4.6', 'c': '9.2', 'd': 1.2}, 'Increment failed.');
    });

    it('Decrementing multiple elements.', async () => {
        await cache.decrementMulti(['a', 'b', 'c'], 1.2);
        let items = await cache.getMulti(['a', 'b', 'c']);
        assert.deepEqual(items, {'a': '1', 'b': '3.4', 'c': '8'}, 'Decrement failed.');
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
                               ttl: 1000,
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

    it('Drop all the stored items.', async () => {
        await cache.set('test', item);
        await cache.invalidate();
        let value = await cache.get('test', {
            silent: true
        });
        assert.deepEqual(value, null, 'Was not possible to drop all cached entries.');
    });
});