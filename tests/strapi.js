process.env.STRAPI_TELEMETRY_DISABLED = 'true';

const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');
const Router = require('@koa/router');

let instance;

async function setupStrapi() {
  if (!instance) {
    instance = await createStrapi().load();
    global.strapi = instance;

    await instance.server.mount();

    const router = new Router({ prefix: '/api' });

    router.get('/hello', (ctx) => {
      ctx.body = 'Hello World!';
    });

    instance.server.use(router.routes());
    instance.server.use(router.allowedMethods());

    const authenticatedRole = await instance.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    if (authenticatedRole) {
      const permissionQuery = instance.db.query('plugin::users-permissions.permission');
      const mePermissionExists = await permissionQuery.findOne({
        where: {
          action: 'plugin::users-permissions.user.me',
          role: authenticatedRole.id,
        },
      });

      if (!mePermissionExists) {
        await permissionQuery.create({
          data: {
            action: 'plugin::users-permissions.user.me',
            role: authenticatedRole.id,
          },
        });
      }
    }
  }

  return instance;
}

async function cleanupStrapi() {
  if (!instance) {
    return;
  }

  const dbSettings = instance.config.get('database.connection');

  if (instance.cron) {
    instance.cron.destroy();
  }

  if (instance.telemetry && typeof instance.telemetry.destroy === 'function') {
    instance.telemetry.destroy();
  }

  // Close server to release the db-file
  await instance.server.httpServer.close();

  // Close the connection to the database before deletion
  await instance.db.connection.destroy();

  // Delete test database after all tests have completed
  if (dbSettings && dbSettings.connection && dbSettings.connection.filename) {
    const tmpDbFile = dbSettings.connection.filename;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }

  instance = undefined;
}

module.exports = { setupStrapi, cleanupStrapi };
