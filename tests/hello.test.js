const fs = require('fs');
const { setupStrapi, cleanupStrapi } = require('./strapi');
const request = require('supertest');

beforeAll(async () => {
  await setupStrapi();
});

afterAll(async () => {
  await cleanupStrapi();
});

it('should return hello world', async () => {
  // Get the Koa server from strapi instance
  await request(strapi.server.httpServer)
    .get('/api/hello') // Make a GET request to the API
    .expect(200) // Expect response http code 200
    .then((data) => {
      expect(data.text).toBe('Hello World!'); // Expect response content
    });
});