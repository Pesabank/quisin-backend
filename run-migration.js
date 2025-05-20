const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'quisin',
  password: 'postgres',
  port: 5432,
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '20250513_update_dishes_dietary.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
