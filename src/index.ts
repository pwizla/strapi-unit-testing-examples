import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.server.api('content-api').routes([
      {
        method: 'GET',
        path: '/hello',
        handler: (ctx) => {
          ctx.body = 'Hello World!';
        },
        config: {
          auth: false,
        },
      },
    ]);
  },
};
