const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function setupDefaultCategories() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'quisin',
    password: 'postgres',
    port: 5432,
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '004_default_categories.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('Running default categories migration...');
    await client.query(migrationSQL);
    console.log('Default categories migration completed successfully!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

setupDefaultCategories();
