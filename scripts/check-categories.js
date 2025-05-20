const { Client } = require('pg');

async function checkCategories() {
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
    
    console.log('\n=== Raw Database Contents ===');
    
    console.log('\nDefault Categories Table:');
    const defaultResult = await client.query('SELECT * FROM default_categories ORDER BY display_order');
    console.log(defaultResult.rows);
    
    console.log('\nRestaurants Table:');
    const restaurantsResult = await client.query('SELECT * FROM restaurants');
    console.log(restaurantsResult.rows);
    
    console.log('\nCategories Table:');
    const categoriesResult = await client.query('SELECT * FROM categories');
    console.log(categoriesResult.rows);
    
    console.log('\nRestaurant Admins Table:');
    const adminResult = await client.query('SELECT * FROM restaurant_admins');
    console.log(adminResult.rows);
    
    console.log('\n=== Formatted Output ===');
    console.log('\nDefault Categories:');
    defaultResult.rows.forEach(row => {
      console.log(`- ${row.name} (Order: ${row.display_order}, Active: ${row.is_active})`)
      console.log(`  Description: ${row.description}\n`);
    });

    console.log('\nCategories by Restaurant:');
    const restaurantResult = await client.query(`
      SELECT r.name as restaurant, c.name as category, c.description, c.is_active 
      FROM categories c 
      JOIN restaurants r ON c.restaurant_id = r.id 
      ORDER BY r.name, c.display_order
    `);
    let currentRestaurant = '';
    restaurantResult.rows.forEach(row => {
      if (row.restaurant !== currentRestaurant) {
        console.log(`\nRestaurant: ${row.restaurant}`);
        currentRestaurant = row.restaurant;
      }
      console.log(`- ${row.category} (Active: ${row.is_active})`)
      console.log(`  Description: ${row.description}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkCategories();
