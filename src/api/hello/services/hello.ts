import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::hello.hello', () => ({
  async getMessage() {
    return 'Hello World!';
  },
}));
