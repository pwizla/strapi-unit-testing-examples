export default {
  routes: [
    {
      method: 'GET',
      path: '/hello',
      handler: 'hello.index',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
