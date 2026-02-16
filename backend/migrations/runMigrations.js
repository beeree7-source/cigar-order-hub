const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'cigar-hub.db');
const db = new sqlite3.Database(dbPath);

const migrationsPath = __dirname;

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsPath)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log('Running migrations...');

migrationFiles.forEach(file => {
  console.log(`Running: ${file}`);
  const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
  
  db.exec(sql, (err) => {
    if (err) {
      console.error(`Error in ${file}:`, err.message);
    } else {
      console.log(`✓ ${file} completed`);
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('All migrations completed');
  }
});
