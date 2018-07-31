const request = require('supertest');
const app = require('./app');

describe('GET /', () => {
    test('should return 200 OK', () => {
        return request(app).get('/')
            .expect(200);
    });

    test('should be cheezy', () => {
        return request(app).get('/')
            .then((response) => {
                expect(response.body).not.toBe('Hello world!');
            });
    });
});
