const fs = require('fs').promises;
const path = require('path');
const db = require('./config/db');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '20250513_add_default_admin.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    await db.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    process.exit();
  }
}

runMigration();
