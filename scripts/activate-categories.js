const { Client } = require('pg');

async function activateCategories() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'quisin',
    password: 'postgres',
    port: 5432,
    ssl: false
  });

  try {
    await client.connect();
    
    // Update all categories to be active
    const updateResult = await client.query(`
      UPDATE categories 
      SET is_active = true 
      WHERE is_active = false 
      RETURNING id, name, is_active
    `);
    
    console.log('Updated categories:', updateResult.rows);
    console.log(`${updateResult.rowCount} categories activated`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

activateCategories();
