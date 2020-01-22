'use strict';

const assert = require('assert');
const lala = require('../../index');
const common = require('../common');

describe('Final cache tests.', () => {
    it('Detecting cache operation based on events.', () => {
        return new Promise((resolve, reject) => {
            let cache = new lala.Cache();
            cache.setDriver('local').then(() => {
                cache.setNamespace('com.lala');
                cache.on('set', (item) => {
                    if ( item === 'events-test' ){
                        cache.on('get', (item, options, value) => {
                            if ( item === 'events-test' && value === 1 ){
                                resolve();
                            }
                        });
                        cache.get('events-test');
                    }
                });
                cache.set('events-test', 1);
            }).catch((ex) => {
                reject(ex);
            });
        });
    });

    it('Check if all the cache driver have been set up.', async () => {
        const drivers = Object.keys(lala.CacheDriverRepository.getAll());
        const expected = ['local', 'redis', 'memcached', 'sqlite3', 'file'];
        const final = expected.filter((element) => {
            return drivers.indexOf(element) === -1;
        });
        assert.deepEqual(final.length, 0, 'Some cache drivers are missing: ' + final);
    });

    it('Check if all the cache templates defined in the loaded configuration file have been generated.', async () => {
        const templates = Object.keys(lala.CacheTemplateRepository.getAll());
        const expected = ['local_driver', 'redis_driver', 'redis_driver_2', 'memcached_driver', 'memcached_driver_2', 'sqlite3_driver', 'sqlite3_driver_2', 'file_driver'];
        const final = expected.filter((element) => {
            return templates.indexOf(element) === -1;
        });
        assert.deepEqual(final.length, 0, 'Some templates are missing: ' + final);
    });

    it('Check if all the connections defined in the loaded configuration file have been generated.', () => {
        let connections = [];
        connections.push(...Object.keys(lala.ConnectionRepository.getAll('redis')));
        connections.push(...Object.keys(lala.ConnectionRepository.getAll('memcached')));
        connections.push(...Object.keys(lala.ConnectionRepository.getAll('sqlite3')));
        const expected = ['redis_test', 'redis_test_cluster', 'memcached_test', 'memcached_test_cluster', 'sqlite3_test'];
        const final = expected.filter((element) => {
            return connections.indexOf(element) === -1;
        });
        assert.deepEqual(final.length, 0, 'Some connections are missing: ' + final);
    });
});