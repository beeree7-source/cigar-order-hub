const db = require('../database');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function seed() {
  try {
    await run(
      `INSERT OR IGNORE INTO users (name, email, password, role, approved)
       VALUES (?, ?, ?, 'supplier', 1)`,
      ['Seed Supplier One', 'seed.supplier1@example.com', 'password123']
    );

    await run(
      `INSERT OR IGNORE INTO users (name, email, password, role, approved)
       VALUES (?, ?, ?, 'retailer', 1)`,
      ['Seed Retailer One', 'seed.retailer1@example.com', 'password123']
    );

    const supplier = await get(`SELECT id FROM users WHERE email = ?`, ['seed.supplier1@example.com']);
    const retailer = await get(`SELECT id FROM users WHERE email = ?`, ['seed.retailer1@example.com']);

    if (!supplier || !retailer) {
      throw new Error('Failed to create or retrieve seed users');
    }

    await run(
      `INSERT OR IGNORE INTO supplier_metrics
       (supplier_id, total_orders, on_time_deliveries, total_deliveries, on_time_percentage, quality_rating, total_revenue, outstanding_balance, credit_limit, payment_terms, last_order_date)
       VALUES (?, 12, 11, 12, 91.67, 4.7, 18350.00, 1200.00, 25000.00, 'Net 30', datetime('now'))`,
      [supplier.id]
    );

    await run(
      `INSERT OR IGNORE INTO products (supplierId, name, sku, price, stock, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [supplier.id, 'Seed Premium Cigar', `SEED-SKU-${supplier.id}`, 19.99, 220, 'Seeded supplier product for endpoint testing']
    );

    const orderItems = JSON.stringify([{ productId: 1, quantity: 6 }]);

    await run(
      `INSERT OR IGNORE INTO orders (retailer_id, supplier_id, items, status, created_at)
       VALUES (?, ?, ?, 'completed', datetime('now', '-2 days'))`,
      [retailer.id, supplier.id, orderItems]
    );

    const sampleOrder = await get(
      `SELECT id FROM orders WHERE supplier_id = ? ORDER BY id DESC LIMIT 1`,
      [supplier.id]
    );

    await run(
      `INSERT OR IGNORE INTO supplier_payments (supplier_id, order_id, amount, payment_method, reference_number, notes)
       VALUES (?, ?, 800.00, 'bank_transfer', ?, 'Seed payment for API testing')`,
      [supplier.id, sampleOrder ? sampleOrder.id : null, `SEED-TXN-${supplier.id}`]
    );

    console.log(JSON.stringify({
      success: true,
      supplierId: supplier.id,
      retailerId: retailer.id,
      message: 'Supplier test data seeded successfully'
    }));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

seed();
