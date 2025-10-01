module.exports = ({ env }) => {
  const filename = env('DATABASE_FILENAME', '.tmp/test.db');
  const requestedClient = env('DATABASE_CLIENT', 'sqlite');
  const client = requestedClient === 'sqlite3' ? 'sqlite' : requestedClient;

  return {
    connection: {
      client,
      connection: {
        filename,
      },
      useNullAsDefault: true,
    },
  };
};