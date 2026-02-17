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

// Run migrations sequentially to avoid race conditions
const runMigrationsSequentially = async () => {
  for (const file of migrationFiles) {
    console.log(`Running: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
    
    try {
      await new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) {
            console.error(`Error in ${file}:`, err.message);
            reject(err);
          } else {
            console.log(`✓ ${file} completed`);
            resolve();
          }
        });
      });
    } catch (err) {
      console.error(`Failed to run ${file}, stopping migrations`);
      break;
    }
  }

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('All migrations completed');
    }
  });
};

runMigrationsSequentially();
