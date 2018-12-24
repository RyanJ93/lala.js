'use strict';

module.exports = {
    local: require('./local'),
    redis: require('./redis'),
    memcached: require('./memcached'),
    sqlite3: require('./sqlite3')
};