import path from 'path';

export default ({ env }) => {
  const rawClient = env('DATABASE_CLIENT', 'sqlite');
  const client = ['sqlite3', 'better-sqlite3'].includes(rawClient) ? 'sqlite' : rawClient;

  const defaultSqliteFilename = env('DATABASE_FILENAME', '.tmp/data.db');
  const sqliteFilename =
    defaultSqliteFilename === ':memory:'
      ? ':memory:'
      : path.join(__dirname, '..', '..', defaultSqliteFilename);

  const sqliteConnection = {
    connection: {
      filename: sqliteFilename,
    },
    useNullAsDefault: true,
  } as const;

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: sqliteConnection,
    'better-sqlite3': sqliteConnection,
    sqlite3: sqliteConnection,
  };

  const normalizedClient = connections[client] ? client : 'sqlite';
  const clientForStrapi = normalizedClient === 'sqlite3' ? 'sqlite' : normalizedClient;

  return {
    connection: {
      client: clientForStrapi,
      ...connections[normalizedClient],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
