const { Client } = require('pg');

async function fixCategoryStatus() {
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
    
    // First, update all default categories to be active
    console.log('Updating default categories...');
    const defaultResult = await client.query(`
      UPDATE default_categories SET is_active = true 
      RETURNING id, name, is_active
    `);
    console.log('Updated default categories:', defaultResult.rows.length);

    // Then, update all restaurant categories to be active
    console.log('\nUpdating restaurant categories...');
    const restaurantResult = await client.query(`
      UPDATE categories SET is_active = true 
      RETURNING id, name, is_active
    `);
    console.log('Updated restaurant categories:', restaurantResult.rows.length);

    // Finally, verify the changes
    console.log('\nVerifying categories...');
    const verifyResult = await client.query(`
      SELECT r.name as restaurant_name, c.name as category_name, c.is_active 
      FROM categories c
      JOIN restaurants r ON c.restaurant_id = r.id
      ORDER BY r.name, c.name
    `);
    console.table(verifyResult.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixCategoryStatus();
