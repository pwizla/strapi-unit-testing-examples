'use strict';

const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreRouter('api::hello.hello', {
  config: {
    find: {
      middlewares: [],
      policies: [],
    },
  },
  routes: [
    {
      method: 'GET',
      path: '/hello',
      handler: 'hello.index',
      config: {
        auth: false,
        middlewares: [],
        policies: [],
      },
    },
  ],
});
