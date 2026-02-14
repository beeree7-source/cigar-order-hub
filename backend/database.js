const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "cigar-hub.db");
const db = new sqlite3.Database(dbPath);

// Create users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('retailer', 'supplier')) NOT NULL,
      approved BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retailer_id INTEGER,
      supplier_id INTEGER,
      items TEXT NOT NULL,  -- JSON string
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(retailer_id) REFERENCES users(id)
    )
  `);

  // Create licenses table
  db.run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      license_number TEXT,
      expiration_date TEXT,
      file_name TEXT,
      verified BOOLEAN DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

module.exports = db;

db.run(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplierId INTEGER,
  name TEXT,
  sku TEXT UNIQUE,
  price REAL,
  stock INTEGER,
  imageUrl TEXT,
  description TEXT,
  FOREIGN KEY(supplierId) REFERENCES users(id)
)`);
