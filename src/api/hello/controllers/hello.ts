import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::hello.hello', ({ strapi }) => ({
  async index(ctx) {
    const message = await strapi.service('api::hello.hello').getMessage();

    ctx.body = message;
  },
}));
