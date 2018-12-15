'use strict';

console.log('Initializing tests...');
console.log('Generating cache items...');
let cacheItems = {};
for ( let i = 0 ; i < 5000 ; i++ ){
    cacheItems[i.toString()] = Math.random().toString(36).substring(7);
}
module.exports.cacheItems = cacheItems;
console.log('Generated ' + Object.keys(cacheItems).length + ' items.');
console.log('Generating a very big item to store in cache (this is going to take a while)...');
let bigCacheItem = '';
for ( let i = 0 ; i < 100000 ; i++ ){
    bigCacheItem += Math.random().toString(36).substring(7);
}
module.exports.bigCacheItem = bigCacheItem;
module.exports.bigCacheItemSize = Math.floor( Buffer.byteLength(bigCacheItem, 'utf8') / 1024 ) + ' Kb';
console.log('Generated ' + module.exports.bigCacheItemSize + ' of data.');