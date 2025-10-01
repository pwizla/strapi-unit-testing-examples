'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    const { body } = ctx.request;

    await strapi.plugin('todo').service('create').create(body);

    ctx.body = 'created';
  },

  async complete(ctx) {
    const { body } = ctx.request;

    await strapi.plugin('todo').service('complete').complete(body);

    ctx.body = 'todo completed';
  },
});
