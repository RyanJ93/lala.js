'use strict';

const assert = require('assert');
const lala = require('../..');

describe('Testing validation rules.', () => {
    it('Testing rule "accepted"', async () => {
        const validator = new lala.Validator({
            test: ['accepted']
        });
        const valid = await validator.validate({
            test: '1'
        });
        const invalid = await validator.validate({
            test: '0'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "activeURL"', async () => {
        const validator = new lala.Validator({
            test: ['activeURL']
        });
        const valid = await validator.validate({
            test: 'https://nodejs.org'
        });
        const invalid = await validator.validate({
            test: 'http://www.undefined.lalajs.moe'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "afterOrEqual"', async () => {
        const validator = new lala.Validator({
            test: ['afterOrEqual<9/12/2020>']
        });
        const valid = await validator.validate({
            test: '9/12/2020'
        });
        const validToo = await validator.validate({
            test: '11/12/2020'
        });
        const invalid = await validator.validate({
            test: '1/10/2010'
        });
        const result = valid && validToo && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "after"', async () => {
        const validator = new lala.Validator({
            test: ['after<9/12/2020>']
        });
        const valid = await validator.validate({
            test: '11/12/2020'
        });
        const invalid = await validator.validate({
            test: '1/10/2010'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "alphaDash"', async () => {
        const validator = new lala.Validator({
            test: ['alphaDash']
        });
        const valid = await validator.validate({
            test: 'b-a-c'
        });
        const invalid = await validator.validate({
            test: 'a -b 2c'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "alphanumeric"', async () => {
        const validator = new lala.Validator({
            test: ['alphanumeric']
        });
        const valid = await validator.validate({
            test: '1a2b3c'
        });
        const invalid = await validator.validate({
            test: '1a 2b-3c'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "alpha"', async () => {
        const validator = new lala.Validator({
            test: ['alpha']
        });
        const valid = await validator.validate({
            test: 'abc'
        });
        const invalid = await validator.validate({
            test: 'abc123'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "array"', async () => {
        const validator = new lala.Validator({
            test: ['array']
        });
        const valid = await validator.validate({
            test: [1, 2, 3]
        });
        const invalid = await validator.validate({
            test: 'string'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "between"', async () => {
        const validator = new lala.Validator({
            test: ['between<1,5>']
        });
        const valid = await validator.validate({
            test: '2.3'
        });
        const invalid = await validator.validate({
            test: '33'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "boolean"', async () => {
        const validator = new lala.Validator({
            test: ['boolean']
        });
        const valid = await validator.validate({
            test: '1'
        });
        const invalid = await validator.validate({
            test: '2'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "date"', async () => {
        const validator = new lala.Validator({
            test: ['date']
        });
        const valid = await validator.validate({
            test: '12/12/2000'
        });
        const invalid = await validator.validate({
            test: '54/34/2000'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "dateEquals"', async () => {
        const validator = new lala.Validator({
            test: ['dateEquals<10/9/2000>']
        });
        const valid = await validator.validate({
            test: '10/9/2000'
        });
        const invalid = await validator.validate({
            test: '12/11/2010'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "different"', async () => {
        const validator = new lala.Validator({
            test: ['different<5, 8, 1>']
        });
        const valid = await validator.validate({
            test: '7'
        });
        const invalid = await validator.validate({
            test: '8'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "digits"', async () => {
        const validator = new lala.Validator({
            test1: ['digits'],
            test2: ['digits<3>']
        });
        const valid = await validator.validate({
            test1: '123',
            test2: '12'
        });
        const invalid = await validator.validate({
            test1: 'a222',
            test2: '122222'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "distinct"', async () => {
        const validator = new lala.Validator({
            test: ['distinct']
        });
        const valid = await validator.validate({
            test: [1, 2, 3]
        });
        const invalid = await validator.validate({
            test: [1, 2, 2]
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "email"', async () => {
        const validator = new lala.Validator({
            test: ['email']
        });
        const valid = await validator.validate({
            test: 'hey@lalajs.moe'
        });
        const invalid = await validator.validate({
            test: '.hey@lalajs.m'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "emailExists"', async () => {
        const validator = new lala.Validator({
            test: ['emailExists']
        });
        const valid = await validator.validate({
            test: 'hey@lalajs.moe'
        });
        const invalid = await validator.validate({
            test: 'undefined@lalajs.moe'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "endsWith"', async () => {
        const validator = new lala.Validator({
            test: ['endsWith<c,2>']
        });
        const valid = await validator.validate({
            test: 'abc'
        });
        const invalid = await validator.validate({
            test: 'qwerty'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "gt"', async () => {
        const validator = new lala.Validator({
            test: ['gt<233.78>']
        });
        const valid = await validator.validate({
            test: '456.2'
        });
        const invalid = await validator.validate({
            test: '23.8976'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "gte"', async () => {
        const validator = new lala.Validator({
            test: ['gte<34.2>']
        });
        const valid = await validator.validate({
            test: '34.2'
        });
        const invalid = await validator.validate({
            test: '12'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "integer"', async () => {
        const validator = new lala.Validator({
            test: ['integer<16>']
        });
        const valid = await validator.validate({
            test: '2F'
        });
        const invalid = await validator.validate({
            test: 'G6'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "in"', async () => {
        const validator = new lala.Validator({
            test: ['in<a,b,c>']
        });
        const valid = await validator.validate({
            test: 'a'
        });
        const invalid = await validator.validate({
            test: 'g'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "ip"', async () => {
        const validator = new lala.Validator({
            any: ['IP'],
            v4: ['IP<4>'],
            v6: ['IP<6>']
        });
        const valid = await validator.validate({
            any: '192.168.1.1',
            v4: '255.168.1.34',
            v6: '::ffff:192.168.89.9'
        });
        const invalid = await validator.validate({
            any: 'abc',
            v4: '256.0.2.34',
            v6: '20010000:0db8:0000:0000:0000:0000:1428:57ab'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "JSON"', async () => {
        const validator = new lala.Validator({
            test: ['JSON']
        });
        const valid = await validator.validate({
            test: '{"a": [1, 2, 3]}'
        });
        const invalid = await validator.validate({
            test: '{"a": {1: "a"}'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "lt"', async () => {
        const validator = new lala.Validator({
            test: ['lt<56.99>']
        });
        const valid = await validator.validate({
            test: '12.66'
        });
        const invalid = await validator.validate({
            test: '98.199'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "lte"', async () => {
        const validator = new lala.Validator({
            test: ['lte<91.22>']
        });
        const valid = await validator.validate({
            test: '91.22'
        });
        const invalid = await validator.validate({
            test: '177.223'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "numeric"', async () => {
        const validator = new lala.Validator({
            test: ['numeric']
        });
        const valid = await validator.validate({
            test: '123.22'
        });
        const invalid = await validator.validate({
            test: '123jjg'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "regex"', async () => {
        const validator = new lala.Validator({
            test: ['regex</^123[a-z]+$/gi>']
        });
        const valid = await validator.validate({
            test: '123aBc'
        });
        const invalid = await validator.validate({
            test: 'b123s'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "requiredIf"', async () => {
        const validator = new lala.Validator({
            test: ['requiredIf<compare, 3>']
        });
        const valid = await validator.validate({
            test: 'OK',
            compare: '3'
        });
        const invalid = await validator.validate({
            compare: '3'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "required"', async () => {
        const validator = new lala.Validator({
            test: ['required']
        });
        const valid = await validator.validate({
            test: 'OK'
        });
        const invalid = await validator.validate({});
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "requiredWith"', async () => {
        const validator = new lala.Validator({
            test: ['requiredWith<first, second>']
        });
        const valid = await validator.validate({
            test: 'OK',
            first: '1'
        });
        const invalid = await validator.validate({
            first: '1'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "requiredWithAll"', async () => {
        const validator = new lala.Validator({
            test: ['requiredWithAll<first, second>']
        });
        const valid = await validator.validate({
            test: 'OK',
            first: '1',
            second: '2'
        });
        const invalid = await validator.validate({
            first: '1',
            second: '2'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "same"', async () => {
        const validator = new lala.Validator({
            test: ['same<$compare>']
        });
        const valid = await validator.validate({
            test: 'OK',
            compare: 'OK'
        });
        const invalid = await validator.validate({
            test: 'OK',
            compare: 'Nope'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "size"', async () => {
        const validator = new lala.Validator({
            test: ['size<10, lt>']
        });
        const valid = await validator.validate({
            test: '123456789'
        });
        const invalid = await validator.validate({
            test: '1234567890'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "startsWith"', async () => {
        const validator = new lala.Validator({
            test: ['startsWith<a, 1>']
        });
        const valid = await validator.validate({
            test: 'abc'
        });
        const invalid = await validator.validate({
            test: 'qwerty'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "string"', async () => {
        const validator = new lala.Validator({
            test: ['string']
        });
        const valid = await validator.validate({
            test: 'abc'
        });
        const invalid = await validator.validate({
            test: true
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "URL"', async () => {
        const validator = new lala.Validator({
            test: ['URL']
        });
        const valid = await validator.validate({
            test: 'http://www.lalajs.moe'
        });
        const invalid = await validator.validate({
            test: 'httpz:/invalid.url'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });

    it('Testing rule "UUID"', async () => {
        const validator = new lala.Validator({
            test: ['UUID']
        });
        const valid = await validator.validate({
            test: 'fdaf6e63-194f-4855-9df2-8764d7be5cf3'
        });
        const invalid = await validator.validate({
            test: '6c14b0-fbb2-4a61-83a3-32667067&&2d'
        });
        const result = valid && !invalid;
        assert.deepEqual(result, true);
    });
});
