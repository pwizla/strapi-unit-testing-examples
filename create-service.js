'use strict';

module.exports = ({ strapi }) => ({
  async create(data) {
    const todoService = strapi.query('plugin::todo.todo');

    return todoService.create({ data });
  },
});
