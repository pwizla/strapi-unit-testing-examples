const fs = require('fs');
const { setupStrapi, cleanupStrapi } = require('./strapi');
const request = require('supertest');

beforeAll(async () => {
  await setupStrapi();
});

afterAll(async () => {
  await cleanupStrapi();
});

let authenticatedUser = {};

// User mock data
const mockUserData = {
  username: 'tester',
  email: 'tester@strapi.com',
  provider: 'local',
  password: '1234abc',
  confirmed: true,
  blocked: null,
};

describe('User API', () => {
  // Create and authenticate a user before all tests
  beforeAll(async () => {
    // Create user and get JWT token
    const user = await strapi.plugins['users-permissions'].services.user.add({
      ...mockUserData,
    });

    const response = await request(strapi.server.httpServer)
      .post('/api/auth/local')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        identifier: mockUserData.email,
        password: mockUserData.password,
      });

    authenticatedUser.jwt = response.body.jwt;
    authenticatedUser.user = response.body.user;
  });

  it('should return users data for authenticated user', async () => {
    await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + authenticatedUser.jwt)
      .expect('Content-Type', /json/)
      .expect(200)
      .then((data) => {
        expect(data.body).toBeDefined();
        expect(data.body.id).toBe(authenticatedUser.user.id);
        expect(data.body.username).toBe(authenticatedUser.user.username);
        expect(data.body.email).toBe(authenticatedUser.user.email);
      });
  });
});