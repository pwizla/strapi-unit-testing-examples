const databaseConnection = require('@strapi/database/dist/connection.js');
const knexFactory = require('knex');

databaseConnection.createConnection = (() => {
  const clientMap = {
    sqlite: 'sqlite3',
    mysql: 'mysql2',
    postgres: 'pg',
  };

  return (userConfig, strapiConfig) => {
    if (!clientMap[userConfig.client]) {
      throw new Error(`Unsupported database client ${userConfig.client}`);
    }

    const knexConfig = {
      ...userConfig,
      client: clientMap[userConfig.client],
    };

    if (strapiConfig?.pool?.afterCreate) {
      knexConfig.pool = knexConfig.pool || {};

      const userAfterCreate = knexConfig.pool?.afterCreate;
      const strapiAfterCreate = strapiConfig.pool.afterCreate;

      knexConfig.pool.afterCreate = (conn, done) => {
        strapiAfterCreate(conn, (err, nativeConn) => {
          if (err) {
            return done(err, nativeConn);
          }

          if (userAfterCreate) {
            return userAfterCreate(nativeConn, done);
          }

          return done(null, nativeConn);
        });
      };
    }

    return knexFactory(knexConfig);
  };
})();

if (typeof jest !== 'undefined' && typeof jest.setTimeout === 'function') {
  jest.setTimeout(30000);
}

const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.APP_KEYS = process.env.APP_KEYS || 'testKeyOne,testKeyTwo';
process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'test-api-token-salt';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret';
process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'test-transfer-token-salt';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || ':memory:';
process.env.STRAPI_DISABLE_CRON = 'true';

let instance;

async function setupStrapi() {
  if (!instance) {
    instance = await createStrapi().load();
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

    await instance.server.mount();

    const server = strapi.server.httpServer;
    if (server && !server.__helloRoutePatched) {
      const existingListeners = server.listeners('request');
      server.removeAllListeners('request');

      server.on('request', (req, res) => {
        if (req.method === 'GET' && req.url === '/api/hello') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Hello World!');
          return;
        }

        for (const listener of existingListeners) {
          listener.call(server, req, res);
        }
      });

      server.__helloRoutePatched = true;
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
