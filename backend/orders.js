const db = require("./database");

// POST /api/orders
const createOrder = (req, res) => {
  const { retailerId, supplierId, items } = req.body;
  
  // Check if retailer approved
  db.get("SELECT approved FROM users WHERE id = ?", [retailerId], (err, retailer) => {
    if (err || !retailer || !retailer.approved) {
      return res.status(403).json({ error: "Retailer not approved" });
    }
    
    db.run(
      "INSERT INTO orders (retailer_id, supplier_id, items) VALUES (?, ?, ?)",
      [retailerId, supplierId, JSON.stringify(items)],
      function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Order created", order: { id: this.lastID, retailerId, supplierId, items, status: "pending" } });
      }
    );
  });
};

// GET /api/orders
const getOrders = (req, res) => {
  db.all("SELECT * FROM orders", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({ ...row, items: JSON.parse(row.items) })));
  });
};

module.exports = { createOrder, getOrders };



