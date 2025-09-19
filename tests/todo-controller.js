module.exports = ({ strapi }) => ({
  async index(ctx) {
    await strapi.plugin('todo').service('create').create({
      data: ctx.request.body,
    });

    ctx.body = 'created';
  },

  async complete(ctx) {
    await strapi.plugin('todo').service('complete').complete({
      data: ctx.request.body,
    });

    ctx.body = 'todo completed';
  },
});
