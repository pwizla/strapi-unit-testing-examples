'use strict';

const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreService('api::hello.hello', () => ({
  async getMessage() {
    return 'Hello World!';
  },
}));
