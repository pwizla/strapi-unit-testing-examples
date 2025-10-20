try {
  require('ts-node/register/transpile-only');
} catch (err) {
  try {
    require('@strapi/typescript-utils/register');
  } catch (strapiRegisterError) {
    require('./ts-runtime');
  }
}

const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const databaseConnection = require('@strapi/database/dist/connection.js');
const knexFactory = require('knex');
const strapiCoreRoot = path.dirname(require.resolve('@strapi/core/package.json'));
const loadConfigFilePath = path.join(strapiCoreRoot, 'dist', 'utils', 'load-config-file.js');
const loadConfigFileModule = require(loadConfigFilePath);
const { compilerOptions: baseCompilerOptions } = require('./ts-compiler-options');

if (!loadConfigFileModule.loadConfigFile.__tsRuntimePatched) {
  const strapiUtils = require('@strapi/utils');
  const originalLoadConfigFile = loadConfigFileModule.loadConfigFile;

  const loadTypeScriptConfig = (file) => {
    const source = fs.readFileSync(file, 'utf8');
    const options = {
      ...baseCompilerOptions,
      module: ts.ModuleKind.CommonJS,
    };

    const output = ts.transpileModule(source, {
      compilerOptions: options,
      fileName: file,
      reportDiagnostics: false,
    });

    const moduleInstance = new Module(file);
    moduleInstance.filename = file;
    moduleInstance.paths = Module._nodeModulePaths(path.dirname(file));
    moduleInstance._compile(output.outputText, file);

    const exported = moduleInstance.exports;
    const resolved = exported && exported.__esModule ? exported.default : exported;

    if (typeof resolved === 'function') {
      return resolved({ env: strapiUtils.env });
    }

    return resolved;
  };

  const patchedLoadConfigFile = (file) => {
    const extension = path.extname(file).toLowerCase();

    if (extension === '.ts' || extension === '.cts' || extension === '.mts') {
      return loadTypeScriptConfig(file);
    }

    return originalLoadConfigFile(file);
  };

  patchedLoadConfigFile.__tsRuntimePatched = true;
  loadConfigFileModule.loadConfigFile = patchedLoadConfigFile;
  require.cache[loadConfigFilePath].exports = loadConfigFileModule;
}

const configLoaderPath = path.join(strapiCoreRoot, 'dist', 'configuration', 'config-loader.js');
const originalLoadConfigDir = require(configLoaderPath);
const validExtensions = ['.js', '.json', '.ts', '.cts', '.mts'];
const mistakenFilenames = {
  middleware: 'middlewares',
  plugin: 'plugins',
};
const restrictedFilenames = [
  'uuid',
  'hosting',
  'license',
  'enforce',
  'disable',
  'enable',
  'telemetry',
  'strapi',
  'internal',
  'launchedAt',
  'serveAdminPanel',
  'autoReload',
  'environment',
  'packageJsonStrapi',
  'info',
  'dirs',
  ...Object.keys(mistakenFilenames),
];
const strapiConfigFilenames = ['admin', 'server', 'api', 'database', 'middlewares', 'plugins', 'features'];

if (!originalLoadConfigDir.__tsRuntimePatched) {
  const patchedLoadConfigDir = (dir) => {
    if (!fs.existsSync(dir)) {
      return {};
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const seenFilenames = new Set();

    const configFiles = entries.reduce((acc, entry) => {
      if (!entry.isFile()) {
        return acc;
      }

      const extension = path.extname(entry.name);
      const extensionLower = extension.toLowerCase();
      const baseName = path.basename(entry.name, extension);
      const baseNameLower = baseName.toLowerCase();

      if (!validExtensions.includes(extensionLower)) {
        console.warn(`Config file not loaded, extension must be one of ${validExtensions.join(',')}): ${entry.name}`);
        return acc;
      }

      if (restrictedFilenames.includes(baseNameLower)) {
        console.warn(`Config file not loaded, restricted filename: ${entry.name}`);
        if (baseNameLower in mistakenFilenames) {
          console.log(`Did you mean ${mistakenFilenames[baseNameLower]}?`);
        }
        return acc;
      }

      const restrictedPrefix = [...restrictedFilenames, ...strapiConfigFilenames].find(
        (restrictedName) => restrictedName.startsWith(baseNameLower) && restrictedName !== baseNameLower
      );

      if (restrictedPrefix) {
        console.warn(`Config file not loaded, filename cannot start with ${restrictedPrefix}: ${entry.name}`);
        return acc;
      }

      if (seenFilenames.has(baseNameLower)) {
        console.warn(`Config file not loaded, case-insensitive name matches other config file: ${entry.name}`);
        return acc;
      }

      seenFilenames.add(baseNameLower);
      acc.push(entry);
      return acc;
    }, []);

    return configFiles.reduce((acc, entry) => {
      const extension = path.extname(entry.name);
      const key = path.basename(entry.name, extension);
      const filePath = path.resolve(dir, entry.name);

      acc[key] = loadConfigFileModule.loadConfigFile(filePath);
      return acc;
    }, {});
  };

  patchedLoadConfigDir.__tsRuntimePatched = true;
  require.cache[configLoaderPath].exports = patchedLoadConfigDir;
}

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
process.env.PORT = process.env.PORT || '0';

const databaseClient = process.env.DATABASE_CLIENT || 'sqlite';
const clientMap = {
  sqlite: 'sqlite3',
  'better-sqlite3': 'sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};

const driver = clientMap[databaseClient];

if (!driver) {
  throw new Error(`Unsupported database client "${databaseClient}".`);
}

if (databaseClient === 'better-sqlite3') {
  process.env.DATABASE_CLIENT = 'sqlite';
}

require(driver);

let instance;
let isCleanedUp = false;

async function setupStrapi() {
  if (!instance) {
    isCleanedUp = false;
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
    
    // Also set it on the global object for better compatibility
    globalThis.strapi = instance;

    // Optionally seed example data for tests if requested
    if (process.env.TEST_SEED === 'true') {
      try {
        const { seedExampleApp } = require(path.join(__dirname, '..', 'scripts', 'seed'));
        await seedExampleApp();
      } catch (e) {
        console.warn('Seeding failed:', e);
      }
    }

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
  if (!global.strapi || !instance || isCleanedUp) {
    return;
  }

  isCleanedUp = true;
  const dbSettings = strapi.config.get('database.connection');

  // Skip Strapi destroy to avoid SQLite pool aborted errors
  // The process will exit anyway, so connections will be cleaned up automatically
  
  if (dbSettings && dbSettings.connection && dbSettings.connection.filename) {
    const tmpDbFile = dbSettings.connection.filename;
    if (tmpDbFile !== ':memory:' && fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }

  instance = undefined;
  delete global.strapi;
}

module.exports = { setupStrapi, cleanupStrapi };
