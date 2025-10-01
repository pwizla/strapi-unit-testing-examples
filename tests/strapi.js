const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.APP_KEYS = process.env.APP_KEYS || 'testKeyOne,testKeyTwo';
process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'test-api-token-salt';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret';
process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'test-transfer-token-salt';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.STRAPI_DISABLE_CRON = 'true';
process.env.PORT = process.env.PORT || '0';

let instance;

async function setupStrapi() {
  if (!instance) {
    instance = await createStrapi().load();
    const contentApi = instance.server?.api?.('content-api');
    if (contentApi && !instance.__helloRouteRegistered) {
      const createHelloService = require(path.join(
        __dirname,
        '..',
        'src',
        'api',
        'hello',
        'services',
        'hello'
      ));
      const helloService = createHelloService({ strapi: instance });

      contentApi.routes([
        {
          method: 'GET',
          path: '/hello',
          handler: async (ctx) => {
            ctx.body = await helloService.getMessage();
          },
          config: {
            auth: false,
          },
        },
      ]);

      contentApi.mount(instance.server.router);
      instance.__helloRouteRegistered = true;
    }
    await instance.start();
    global.strapi = instance;

    const userService = strapi.plugins['users-permissions']?.services?.user;
    if (userService) {
      const originalAdd = userService.add.bind(userService);

      userService.add = async (values) => {
        const data = { ...values };

        if (!data.role) {
          const defaultRole = await strapi.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'authenticated' } });

          if (defaultRole) {
            data.role = defaultRole.id;
          }
        }

        return originalAdd(data);
      };
    }

  }
  return instance;
}

async function cleanupStrapi() {
  if (!global.strapi) {
    return;
  }

  const dbSettings = strapi.config.get('database.connection');

  await strapi.server.httpServer.close();
  await strapi.db.connection.destroy();

  if (typeof strapi.destroy === 'function') {
    await strapi.destroy();
  }

  if (dbSettings && dbSettings.connection && dbSettings.connection.filename) {
    const tmpDbFile = dbSettings.connection.filename;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }
}

module.exports = { setupStrapi, cleanupStrapi };
