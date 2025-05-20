const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function fixDishesColumn() {
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
    const migrationPath = path.join(__dirname, '..', 'migrations', '005_fix_dishes_column.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running dishes column fix migration...');
    await client.query(migrationSql);
    console.log('Dishes column fix completed successfully!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixDishesColumn();
