/**
 * Database Migration Runner for Quisin
 * 
 * This script runs all SQL migration files in the migrations directory
 * in alphabetical order to set up or update the database schema.
 */

require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Create a connection pool with direct settings
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'quisin',
  password: 'admin',
  port: 5432,
  ssl: false
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Starting database migrations...');
    
    // Get all SQL files in the migrations directory
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure they run in order (001_, 002_, etc.)
    
    // Run each migration file
    for (const file of migrationFiles) {
      // Check if migration has already been executed
      const { rows } = await client.query('SELECT name FROM migrations WHERE name = $1', [file]);
      
      if (rows.length > 0) {
        console.log(`⏭️ Migration ${file} already executed, skipping...`);
        continue;
      }
      
      console.log(`Running migration: ${file}`);
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Start a transaction for each migration
      await client.query('BEGIN');
      
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.log(sql)
        console.error(`❌ Error in migration ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Release the client back to the pool
    client.release();
    await pool.end();
  }
}

// Run the migrations
module.exports = runMigrations;
