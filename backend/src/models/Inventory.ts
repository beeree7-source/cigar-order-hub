import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Inventory extends Model {
  public id!: number;
  public retailerId!: number;
  public product!: string;
  public sku!: string;
  public quantity!: number;
  public minThreshold!: number;  // Auto-reorder trigger
  public supplierId?: number;
}

Inventory.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  retailerId: DataTypes.INTEGER,
  product: DataTypes.STRING,
  sku: DataTypes.STRING,
  quantity: DataTypes.INTEGER,
  minThreshold: DataTypes.INTEGER,  // When quantity < this, auto-order
  supplierId: DataTypes.INTEGER
}, { sequelize, modelName: 'Inventory' });

export default Inventory;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface InventoryAttributes {
  id: number;
  retailerId: number;
  product: string;
  sku: string;
  quantity: number;
  minThreshold: number;
  supplierId?: number;
}

export interface InventoryInput extends Optional<InventoryAttributes, 'id'> {}

class Inventory extends Model<InventoryAttributes, InventoryInput> implements InventoryAttributes {
  public id!: number;
  public retailerId!: number;
  public product!: string;
  public sku!: string;
  public quantity!: number;
  public minThreshold!: number;
  public supplierId?: number;
}

Inventory.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  retailerId: { type: DataTypes.INTEGER, allowNull: false },
  product: { type: DataTypes.STRING(255), allowNull: false },
  sku: { type: DataTypes.STRING(100), allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  minThreshold: { type: DataTypes.INTEGER, defaultValue: 10 },
  supplierId: { type: DataTypes.INTEGER }
}, { sequelize, modelName: 'Inventory' });

export default Inventory;
