import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::hello.hello', {
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
