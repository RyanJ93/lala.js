'use strict';

const assert = require('assert');
const lala = require('../..');
const { fetchHTTPResponse, fetchHTTPResponsePOST } = require('../utilities');
const TestForm = require('./TestForm');
const FormWithArray = require('./FormWithArray');
const BigAndComplexForm = require('./BigAndComplexForm');

describe('Testing form validation and casting.', () => {
    let testSerer, testRouter, port;

    it('Processing fields manually.', async () => {
        const expectedValues = {
            some_date: new Date('12-12-2000'),
            some_number: 123.5,
            another_value: 'Some value.'
        };
        const form = new TestForm();
        const result = await form.process({
            some_date: '12-12-2000',
            some_number: '123.5',
            another_value: 'Some value.'
        });
        assert.deepStrictEqual(expectedValues, result);
    });

    it('Processing fields containing an array of values.', async () => {
        const expectedValues = {
            some_array: [12, 45, 67.6],
            another_array: ['a', 'b', 'c']
        };
        const form = new FormWithArray();
        const result = await form.process({
            some_array: ['12', '45', '67.6'],
            another_array: ['a', 'b', 'c'],
        });
        assert.deepStrictEqual(expectedValues, result);
    });

    it('Processing a form passing an invalid set of values.', async () => {
        const form = new TestForm();
        const result = await form.process({
            some_date: 'Invalid date',
            some_number: 'Invalid number'
        });
        assert.deepStrictEqual(null, result);
    });

    it('Setting up the test server.', async () => {
        testSerer = new lala.HTTPServer();
        testRouter = new lala.Router();
        port = testSerer.setRouters([testRouter]).useRandomPort();
        await testSerer.start();
    });

    it('Emulate a request and validate input data (GET).', async () => {
        testRouter.get('/test-get', (request) => {
            return request.formValid === true ? {
                some_date: request.query.some_date,
                some_number: request.query.some_number
            } : null;
        }, {
            form: TestForm
        });
        const compare = JSON.stringify({
            some_date: ( new Date('12/12/2020') ),
            some_number: 67
        });
        const url = 'http://127.0.0.1:' + port + '/test-get?some_date=12/12/2020&some_number=67';
        const response = await fetchHTTPResponse(url);
        assert.deepStrictEqual(response.body, compare);
    });

    it('Emulate a request and validate input data (POST).', async () => {
        testRouter.post('/test-post', (request) => {
            return request.formValid === true ? {
                some_date: request.params.some_date,
                some_number: request.params.some_number
            } : null;
        }, {
            form: TestForm
        });
        const compare = JSON.stringify({
            some_date: ( new Date('12/12/2020') ),
            some_number: 92322.2
        });
        const response = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/test-post', {
            some_date: '12/12/2020',
            some_number: '92322.2'
        });
        assert.deepStrictEqual(response.body, compare);
    });

    it('Emulate a request and validate input data (POST).', async () => {
        testRouter.post('/big-and-complex-test', (request) => {
            return request.formValid === true ? {
                first_name: request.params.first_name,
                last_name: request.query.last_name,
                birth_day: request.params.birth_day,
                gender: request.query.gender,
                age: request.params.age,
                weight: request.query.weight,
                email: request.params.email,
                fav_foods: request.query.fav_foods,
                profile_url: request.params.profile_url,
                allow_cookies: request.query.allow_cookies,
                some_json: request.params.some_json
            } : null;
        }, {
            form: BigAndComplexForm
        });
        const compare = JSON.stringify({
            first_name: 'Sig.',
            last_name: 'Test',
            birth_day: new Date('12/12/2000'),
            gender: 'M',
            age: 23,
            weight: 65.3,
            email: 'sigtest@lalajs.moe',
            fav_foods: ['Pizza', 'Lasagna'],
            profile_url: 'https://www.nodejs.org',
            allow_cookies: true,
            some_json: {
                abc: "123",
                arr: [1, 2, 3]
            }
        });
        const getParams = 'last_name=Test&gender=M&weight=65.3&fav_foods=Pizza,Lasagna&allow_cookies=1';
        const response = await fetchHTTPResponsePOST('http://127.0.0.1:' + port + '/big-and-complex-test?' + getParams, {
            first_name: 'Sig.',
            birth_day: '12/12/2000',
            age: 23,
            email: 'sigtest@lalajs.moe',
            profile_url: 'https://www.nodejs.org',
            some_json: '{"abc":"123","arr":[1,2,3]}'
        });
        assert.deepStrictEqual(response.body, compare);
    });

    it('Emulate a wrong request and get the error messages.', async () => {
        testRouter.get('/test-messages', (request) => {
            return request.formValid === true ? '' : Object.values(request.formErrors).map((block) => {
                return Object.values(block)[0];
            });
        }, {
            form: TestForm
        });
        const url = 'http://127.0.0.1:' + port + '/test-messages?some_date=not-a-date&some_number=not-a-number';
        const response = await fetchHTTPResponse(url);
        const compare = ['Field some_date must contain a valid date.', 'Field some_number must be a valid number.'];
        assert.deepStrictEqual(JSON.parse(response.body), compare);
    });
});
