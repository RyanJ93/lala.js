'use strict';

const _nativeKeywords = new Map([
    ['@number', '[0-9]+'],
    ['@string', '[a-zA-Z0-9]+']
]);
const _keywords = new Map();

class Keywords {
    static getValue(name){
        if ( name.charAt(0) !== '@' ){
            name = '@' + name;
        }
        let value = _nativeKeywords.get(name);
        if ( typeof value !== 'undefined' ){
            return value;
        }
        value = _keywords.get(name);
        return typeof value !== 'undefined' ? value : null;
    }
}

module.exports = Keywords;