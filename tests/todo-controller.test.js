const todoController = require('./todo-controller');

describe('Todo controller', () => {
  let strapi;

  beforeEach(() => {
    strapi = {
      plugin: jest.fn().mockReturnValue({
        service: jest.fn().mockReturnValue({
          create: jest.fn().mockReturnValue({
            data: {
              name: 'test',
              status: false,
            },
          }),
          complete: jest.fn().mockReturnValue({
            data: {
              id: 1,
              status: true,
            },
          }),
        }),
      }),
    };
  });

  it('creates a todo item', async () => {
    const ctx = {
      request: {
        body: {
          name: 'test',
        },
      },
      body: null,
    };

    await todoController({ strapi }).index(ctx);

    expect(ctx.body).toBe('created');
    expect(strapi.plugin('todo').service('create').create).toHaveBeenCalledTimes(1);
  });

  it('completes a todo item', async () => {
    const ctx = {
      request: {
        body: {
          id: 1,
        },
      },
      body: null,
    };

    await todoController({ strapi }).complete(ctx);

    expect(ctx.body).toBe('todo completed');
    expect(strapi.plugin('todo').service('complete').complete).toHaveBeenCalledTimes(1);
  });
});
