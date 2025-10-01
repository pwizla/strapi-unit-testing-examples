export default {
  register() {},
  bootstrap({ strapi }) {
    strapi.server.api('content-api').routes([
      {
        method: 'GET',
        path: '/hello',
        handler: async (ctx) => {
          ctx.body = 'Hello World!';
        },
        config: {
          auth: false,
        },
      },
    ]);
  },
};
