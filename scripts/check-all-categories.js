const { Client } = require('pg');

async function checkAllCategories() {
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
    
    // Check default categories
    console.log('\n=== Default Categories ===');
    const defaultResult = await client.query(`
      SELECT * FROM default_categories ORDER BY display_order
    `);
    console.table(defaultResult.rows);

    // Check restaurant categories
    console.log('\n=== Restaurant Categories ===');
    const restaurantResult = await client.query(`
      SELECT c.*, r.name as restaurant_name 
      FROM categories c
      JOIN restaurants r ON c.restaurant_id = r.id
      ORDER BY r.name, c.display_order
    `);
    console.table(restaurantResult.rows);

    // If no categories exist, let's run the copy function
    if (restaurantResult.rows.length === 0) {
      console.log('\nNo restaurant categories found. Running copy function...');
      
      // Get demo restaurant ID
      const restaurantQuery = `
        SELECT r.id, r.name
        FROM restaurants r
        JOIN restaurant_admins ra ON r.id = ra.restaurant_id
        JOIN users u ON ra.user_id = u.id
        WHERE u.email = 'admin@quisin.com'
      `;
      const demoRestaurant = await client.query(restaurantQuery);
      
      if (demoRestaurant.rows.length > 0) {
        const restaurantId = demoRestaurant.rows[0].id;
        
        // Copy default categories
        await client.query(`
          INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active)
          SELECT uuid_generate_v4(), $1, name, description, display_order, true
          FROM default_categories
          WHERE is_active = true
        `, [restaurantId]);
        
        console.log('Default categories copied to restaurant:', demoRestaurant.rows[0].name);
        
        // Show the newly created categories
        console.log('\n=== Newly Created Categories ===');
        const newCategoriesResult = await client.query(`
          SELECT * FROM categories WHERE restaurant_id = $1
          ORDER BY display_order
        `, [restaurantId]);
        console.table(newCategoriesResult.rows);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAllCategories();
