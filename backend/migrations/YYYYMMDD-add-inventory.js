'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Inventories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, autoIncrement: true },
      retailerId: { type: Sequelize.INTEGER, allowNull: false },
      product: { type: Sequelize.STRING(255), allowNull: false },
      sku: { type: Sequelize.STRING(100), allowNull: false },
      quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      minThreshold: { type: Sequelize.INTEGER, defaultValue: 10 },
      supplierId: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Inventories');
  }
};
