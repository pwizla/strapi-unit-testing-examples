module.exports = ({ strapi }) => ({
  async create(attributes) {
    return strapi.query('plugin::todo.todo').create({
      data: attributes,
    });
  },
});
