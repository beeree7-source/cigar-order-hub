let orders = [];

// POST /api/orders (retailer creates order for supplier)
const createOrder = (req, res) => {
  const { retailerId, supplierId, items } = req.body;
  // Check if retailer is approved
  const retailer = require("./users").users?.find(u => u.id === retailerId);
  if (!retailer || !retailer.approved) {
    return res.status(403).json({ error: "Retailer not approved" });
  }
  const order = {
    id: Date.now(),
    retailerId,
    supplierId,
    items, // e.g. [{product: "Cohiba", qty: 10}]
    status: "pending",
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  res.json({ message: "Order created", order });
};

module.exports = { createOrder };
