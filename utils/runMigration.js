require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// Get migration file path from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Please provide a migration file path');
  console.log('Usage: node runMigration.js <migrationFilePath>');
  process.exit(1);
}

const fullPath = path.resolve(migrationFile);

if (!fs.existsSync(fullPath)) {
  console.error(`Migration file not found: ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Running migration: ${migrationFile}`);
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    // Close the pool
    await pool.end();
  }
}

runMigration();
