import express from 'express';
import { authenticateToken } from '../middleware/auth';
import Inventory from '../models/Inventory';
import Order from '../models/Order';

const router = express.Router();

// Get retailer's inventory
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const inventory = await Inventory.findAll({ where: { retailerId: userId } });
  res.json(inventory);
});

// Add/Update inventory item
router.post('/', authenticateToken, async (req, res) => {
  const { product, sku, quantity, minThreshold, supplierId } = req.body;
  const userId = req.user.id;
  
  await Inventory.upsert({
    retailerId: userId,
    product, sku, quantity, minThreshold, supplierId
  });
  
  // Check auto-reorder
  if (quantity <= minThreshold) {
    await Order.create({
      retailerId: userId,
      product,
      quantity: 50,  // Auto-order amount
      price: 25.00,
      autoOrder: true
    });
  }
  
  res.json({ success: true });
});

// Low inventory alerts
router.get('/low-stock', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const lowStock = await Inventory.findAll({
    where: { 
      retailerId: userId,
      quantity: { [Op.lt]: sequelize.col('minThreshold') }
    }
  });
  res.json(lowStock);
});

import express from 'express';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth';
import Inventory from '../models/Inventory';
import Order from '../models/Order';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const inventory = await Inventory.findAll({ where: { retailerId: userId } });
  res.json(inventory);
});

router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const { product, sku, quantity, minThreshold, supplierId } = req.body;
  
  await Inventory.upsert({
    retailerId: userId,
    product, sku, quantity, minThreshold, supplierId
  });
  
  // AUTO-REORDER if low
  if (quantity <= minThreshold) {
    await Order.create({
      retailerId: userId,
      product,
      quantity: Math.max(50, minThreshold * 2), // Smart reorder qty
      price: 25.00,
      autoOrder: true,
      status: 'pending'
    });
  }
  
  res.json({ success: true, message: 'Inventory updated' });
});

router.get('/low-stock', authenticateToken, async (req, res) => {
  const userId = req.user!.id;
  const lowStock = await Inventory.findAll({
    where: { 
      retailerId: userId,
      quantity: { [Op.lt]: sequelize.col('minThreshold') }
    }
  });
  res.json(lowStock);
});

export default router;
