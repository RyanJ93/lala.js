'use strict';

const lala = require('../');

console.log('Initializing tests...');
console.log('Generating cache items...');
let cacheItems = {};
for ( let i = 0 ; i < 300 ; i++ ){
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
module.exports.bigPrimeNumber = BigInt('11809778018313501643069502360922248494285054628785121145260180317881866540265484483137856174338099878083390284545346762613088443778354838516325204182575809');
console.log('Generated ' + module.exports.bigCacheItemSize + ' of data.');
lala.Logger.setDebug(true);
