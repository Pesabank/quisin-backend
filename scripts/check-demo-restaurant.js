const { Client } = require('pg');

async function checkDemoRestaurant() {
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
    
    // First, find the demo restaurant and admin
    console.log('\n=== Demo Restaurant Info ===');
    const restaurantResult = await client.query(`
      SELECT r.id as restaurant_id, r.name as restaurant_name, 
             u.id as admin_id, u.email as admin_email,
             ra.id as admin_link_id
      FROM restaurants r
      JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      JOIN users u ON ra.user_id = u.id
      WHERE u.email = 'admin@quisin.com'
    `);
    console.table(restaurantResult.rows);

    if (restaurantResult.rows.length > 0) {
      const restaurantId = restaurantResult.rows[0].restaurant_id;
      
      // Check categories for this restaurant
      console.log('\n=== Categories for Demo Restaurant ===');
      const categoriesResult = await client.query(`
        SELECT id, name, description, is_active, created_at
        FROM categories
        WHERE restaurant_id = $1
        ORDER BY display_order, name
      `, [restaurantId]);
      console.table(categoriesResult.rows);

      // Check if default categories exist
      console.log('\n=== Default Categories ===');
      const defaultResult = await client.query(`
        SELECT id, name, description, is_active
        FROM default_categories
        ORDER BY display_order
      `);
      console.table(defaultResult.rows);

      // Let's copy default categories if none exist
      if (categoriesResult.rows.length === 0 && defaultResult.rows.length > 0) {
        console.log('\nNo categories found for demo restaurant. Copying default categories...');
        await client.query(`
          INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active)
          SELECT uuid_generate_v4(), $1, name, description, display_order, is_active
          FROM default_categories
          WHERE is_active = true
          ORDER BY display_order
        `, [restaurantId]);
        console.log('Default categories copied successfully!');
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDemoRestaurant();
